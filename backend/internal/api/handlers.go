package api

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"btd/backend/internal/service"
)

// --- Contenu -----------------------------------------------------------------

func (s *Server) courses(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.Courses(r.Context())
	respond(w, v, err)
}

func (s *Server) chapter(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.Chapter(r.Context(), r.PathValue("id"))
	respond(w, v, err)
}

func (s *Server) lesson(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.Lesson(r.Context(), r.PathValue("id"))
	respond(w, v, err)
}

func (s *Server) completeLesson(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.CompleteLesson(r.Context(), r.PathValue("id"))
	respond(w, v, err)
}

// --- Exercices ---------------------------------------------------------------

const maxFiles = 20

// readFiles lit le corps {"files": {...}} commun au brouillon et à l'exécution.
func readFiles(w http.ResponseWriter, r *http.Request) (map[string]string, bool) {
	var body struct {
		Files map[string]string `json:"files"`
	}
	if !decodeJSON(w, r, &body) {
		return nil, false
	}
	if body.Files == nil || len(body.Files) > maxFiles {
		writeError(w, http.StatusUnprocessableEntity, "files : objet de 20 fichiers au plus requis")
		return nil, false
	}
	return body.Files, true
}

func (s *Server) sandbox(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.Sandbox(r.Context())
	respond(w, v, err)
}

func (s *Server) exercise(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.Exercise(r.Context(), r.PathValue("id"))
	respond(w, v, err)
}

func (s *Server) saveDraft(w http.ResponseWriter, r *http.Request) {
	if files, ok := readFiles(w, r); ok {
		noContent(w, s.svc.SaveDraft(r.Context(), r.PathValue("id"), files))
	}
}

func (s *Server) reset(w http.ResponseWriter, r *http.Request) {
	noContent(w, s.svc.Reset(r.Context(), r.PathValue("id")))
}

func (s *Server) revealHint(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.RevealHint(r.Context(), r.PathValue("id"))
	respond(w, v, err)
}

func (s *Server) run(w http.ResponseWriter, r *http.Request) {
	if files, ok := readFiles(w, r); ok {
		v, err := s.svc.Run(r.Context(), r.PathValue("id"), files)
		respond(w, v, err)
	}
}

// --- Quiz --------------------------------------------------------------------

func (s *Server) quiz(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.Quiz(r.Context(), r.PathValue("id"))
	respond(w, v, err)
}

func (s *Server) answer(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Answer json.RawMessage `json:"answer"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Answer == nil {
		writeError(w, http.StatusUnprocessableEntity, "answer requis")
		return
	}
	var answer any
	_ = json.Unmarshal(body.Answer, &answer) // déjà validé par le décodage du corps
	v, err := s.svc.Answer(r.Context(), r.PathValue("id"), r.PathValue("question"), answer)
	respond(w, v, err)
}

// --- Progression -------------------------------------------------------------

// userDay lit le fuseau IANA envoyé par le navigateur : il décide à quel jour appartient une action.
func userDay(w http.ResponseWriter, r *http.Request) (today time.Time, tz string, ok bool) {
	tz = r.URL.Query().Get("tz")
	if tz == "" {
		tz = "UTC"
	}
	if len(tz) > 64 {
		writeError(w, http.StatusUnprocessableEntity, "tz : 64 caractères maximum")
		return today, tz, false
	}
	loc, err := time.LoadLocation(tz)
	if err != nil || tz == "Local" {
		writeError(w, http.StatusBadRequest, "fuseau horaire inconnu")
		return today, tz, false
	}
	y, m, d := time.Now().In(loc).Date()
	return service.Date(y, m, d), tz, true
}

func (s *Server) progress(w http.ResponseWriter, r *http.Request) {
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.Summary(r.Context(), today, tz)
		respond(w, v, err)
	}
}

func (s *Server) activity(w http.ResponseWriter, r *http.Request) {
	weeks, ok := intParam(w, r, "weeks", 26, 1, 53)
	if !ok {
		return
	}
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.Activity(r.Context(), today, weeks, tz)
		respond(w, v, err)
	}
}

func (s *Server) feed(w http.ResponseWriter, r *http.Request) {
	var day *time.Time
	if raw := r.URL.Query().Get("day"); raw != "" {
		d, err := time.Parse(time.DateOnly, raw)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "day : date AAAA-MM-JJ attendue")
			return
		}
		day = &d
	}
	limit, ok := intParam(w, r, "limit", 50, 1, 200)
	if !ok {
		return
	}
	if today, tz, ok := userDay(w, r); ok {
		v, err := s.svc.Feed(r.Context(), today, tz, day, limit)
		respond(w, v, err)
	}
}

// --- Profil ------------------------------------------------------------------

func (s *Server) profile(w http.ResponseWriter, r *http.Request) {
	v, err := s.svc.Profile(r.Context())
	respond(w, v, err)
}

func (s *Server) avatar(w http.ResponseWriter, r *http.Request) {
	data, ctype, err := s.svc.Avatar(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	// L'URL porte ?v=<version> : on peut donc la cacher longtemps, elle change à chaque envoi.
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "private, max-age=31536000")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(data)
}

// putAvatar lit le corps brut de l'image (pas de multipart : une dépendance de moins).
func (s *Server) putAvatar(w http.ResponseWriter, r *http.Request) {
	if r.ContentLength > service.MaxAvatarBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "image trop lourde (2 Mo maximum)")
		return
	}
	data, err := io.ReadAll(io.LimitReader(r.Body, service.MaxAvatarBytes+1))
	if err != nil {
		fail(w, err)
		return
	}
	noContent(w, s.svc.SetAvatar(r.Context(), data))
}

func (s *Server) deleteAvatar(w http.ResponseWriter, r *http.Request) {
	noContent(w, s.svc.RemoveAvatar(r.Context()))
}
