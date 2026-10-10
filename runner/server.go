package main

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"strings"
	"time"
)

const (
	maxFiles       = 200
	maxCommandLen  = 500
	maxRequestBody = 16 << 20
)

type RunRequest struct {
	Language string            `json:"language"`
	Files    map[string]string `json:"files"`
	Command  string            `json:"command"`
	TimeoutS int               `json:"timeout_s"`
}

func (r RunRequest) validate() error {
	if len(r.Files) > maxFiles {
		return fmt.Errorf("trop de fichiers (%d maximum)", maxFiles)
	}
	if len(r.Command) > maxCommandLen {
		return fmt.Errorf("commande trop longue (%d caractères maximum)", maxCommandLen)
	}
	if r.TimeoutS < 1 {
		return errors.New("timeout_s doit être ≥ 1")
	}
	for p := range r.Files {
		if !safePath(p) {
			return fmt.Errorf("chemin de fichier interdit : %q", p)
		}
	}
	return nil
}

// safePath n'accepte que des chemins relatifs qui restent dans /work.
func safePath(p string) bool {
	if p == "" || strings.HasPrefix(p, "/") || strings.ContainsRune(p, '\\') {
		return false
	}
	for part := range strings.SplitSeq(p, "/") {
		if part == ".." {
			return false
		}
	}
	return path.Clean(p) != "."
}

type Server struct {
	cfg   Config
	exec  Executor
	slots chan struct{}
}

func NewServer(cfg Config, exec Executor) *Server {
	return &Server{cfg: cfg, exec: exec, slots: make(chan struct{}, cfg.MaxConcurrentRuns)}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /run", s.requireToken(s.run))
	return mux
}

func (s *Server) requireToken(next http.HandlerFunc) http.HandlerFunc {
	expected := []byte("Bearer " + s.cfg.Token)
	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), expected) != 1 {
			writeError(w, http.StatusUnauthorized, "invalid runner token")
			return
		}
		next(w, r)
	}
}

func (s *Server) run(w http.ResponseWriter, r *http.Request) {
	var req RunRequest
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxRequestBody))
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "corps JSON invalide : "+err.Error())
		return
	}
	if err := req.validate(); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	image, ok := s.cfg.Images[req.Language]
	if !ok {
		writeError(w, http.StatusBadRequest, "langage non supporté : "+req.Language)
		return
	}
	timeout := time.Duration(min(req.TimeoutS, s.cfg.MaxTimeoutS)) * time.Second

	select {
	case s.slots <- struct{}{}:
		defer func() { <-s.slots }()
	case <-r.Context().Done():
		return
	}
	res, err := s.exec.Run(r.Context(), image, req.Files, req.Command, timeout)
	if err != nil {
		slog.Error("exécution impossible", "err", err)
		writeError(w, http.StatusInternalServerError, "exécution impossible : "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, detail string) {
	writeJSON(w, status, map[string]string{"detail": detail})
}
