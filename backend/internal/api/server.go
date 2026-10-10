// Package api expose le service en HTTP/JSON. Aucun accès à la base ici : tout passe par service.
package api

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"btd/backend/internal/service"
)

const maxJSONBody = 8 << 20

type Config struct {
	AppPassword   string
	SessionSecret string
	SecureCookies bool
}

type Server struct {
	svc      *service.Service
	password string
	sessions sessions
}

func New(svc *service.Service, cfg Config) http.Handler {
	s := &Server{
		svc:      svc,
		password: cfg.AppPassword,
		sessions: sessions{secret: []byte(cfg.SessionSecret), secure: cfg.SecureCookies, now: time.Now},
	}
	mux := http.NewServeMux()

	// Public
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /api/auth/login", s.login)
	mux.HandleFunc("POST /api/auth/logout", s.logout)
	mux.HandleFunc("GET /api/auth/me", s.me)
	mux.HandleFunc("GET /api/catalog", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, s.svc.Catalog())
	})

	// Connecté
	protected := map[string]http.HandlerFunc{
		"GET /api/courses":                            s.courses,
		"GET /api/chapters/{id}":                      s.chapter,
		"GET /api/lessons/{id}":                       s.lesson,
		"POST /api/lessons/{id}/complete":             s.completeLesson,
		"GET /api/exercises":                          s.sandbox,
		"GET /api/exercises/{id}":                     s.exercise,
		"PUT /api/exercises/{id}/draft":               s.saveDraft,
		"POST /api/exercises/{id}/reset":              s.reset,
		"POST /api/exercises/{id}/hints":              s.revealHint,
		"POST /api/exercises/{id}/run":                s.run,
		"GET /api/quizzes/{id}":                       s.quiz,
		"POST /api/quizzes/{id}/questions/{question}": s.answer,
		"GET /api/progress":                           s.progress,
		"GET /api/activity":                           s.activity,
		"GET /api/activity/feed":                      s.feed,
		"GET /api/profile":                            s.profile,
		"GET /api/profile/avatar":                     s.avatar,
		"PUT /api/profile/avatar":                     s.putAvatar,
		"DELETE /api/profile/avatar":                  s.deleteAvatar,
	}
	for pattern, h := range protected {
		mux.HandleFunc(pattern, s.requireAuth(h))
	}
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "Not Found")
	})
	return logRequests(mux)
}

func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.sessions.authenticated(r) {
			writeError(w, http.StatusUnauthorized, "non connecté")
			return
		}
		s.sessions.issue(w) // session glissante
		next(w, r)
	}
}

// --- Auth --------------------------------------------------------------------

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Password *string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Password == nil {
		writeError(w, http.StatusUnprocessableEntity, "password requis")
		return
	}
	if subtle.ConstantTimeCompare([]byte(*body.Password), []byte(s.password)) != 1 {
		writeError(w, http.StatusUnauthorized, "mot de passe incorrect")
		return
	}
	s.sessions.issue(w)
	writeJSON(w, http.StatusOK, map[string]bool{"authenticated": true})
}

func (s *Server) logout(w http.ResponseWriter, _ *http.Request) {
	s.sessions.clear(w)
	writeJSON(w, http.StatusOK, map[string]bool{"authenticated": false})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"authenticated": s.sessions.authenticated(r)})
}

// --- Réponses ----------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("réponse JSON", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, detail string) {
	writeJSON(w, status, map[string]string{"detail": detail})
}

var statusOf = map[service.Kind]int{
	service.NotFound:    http.StatusNotFound,
	service.Invalid:     http.StatusBadRequest,
	service.TooLarge:    http.StatusRequestEntityTooLarge,
	service.Unsupported: http.StatusUnsupportedMediaType,
	service.Unavailable: http.StatusServiceUnavailable,
}

// respond écrit le résultat d'un appel au service, ou l'erreur traduite en statut HTTP.
func respond(w http.ResponseWriter, v any, err error) {
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func noContent(w http.ResponseWriter, err error) {
	if err != nil {
		fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func fail(w http.ResponseWriter, err error) {
	var se *service.Error
	if errors.As(err, &se) {
		writeError(w, statusOf[se.Kind], se.Detail)
		return
	}
	slog.Error("erreur interne", "err", err)
	writeError(w, http.StatusInternalServerError, "erreur interne")
}

// decodeJSON lit le corps ; en cas d'échec il répond 422, comme FastAPI.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxJSONBody)).Decode(dst); err != nil {
		if errors.Is(err, io.EOF) {
			err = errors.New("corps vide")
		}
		writeError(w, http.StatusUnprocessableEntity, "corps JSON invalide : "+err.Error())
		return false
	}
	return true
}

// intParam lit un paramètre entier borné ; en cas d'échec il répond 422.
func intParam(w http.ResponseWriter, r *http.Request, name string, def, lo, hi int) (int, bool) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return def, true
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < lo || v > hi {
		writeError(w, http.StatusUnprocessableEntity, fmt.Sprintf("%s doit être un entier entre %d et %d", name, lo, hi))
		return 0, false
	}
	return v, true
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		slog.Info("requête", "method", r.Method, "path", r.URL.Path, "status", rec.status,
			"ms", time.Since(start).Milliseconds())
	})
}
