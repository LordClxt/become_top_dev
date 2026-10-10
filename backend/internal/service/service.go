// Package service porte les règles métier. Il lit le contenu en mémoire et l'état via les repositories.
package service

import (
	"fmt"
	"strings"
	"time"

	"btd/backend/internal/content"
	"btd/backend/internal/repository"
)

type Kind int

const (
	NotFound Kind = iota
	Invalid
	TooLarge
	Unsupported
	Unavailable
)

// Error est une erreur destinée à l'utilisateur ; l'API la traduit en statut HTTP.
type Error struct {
	Kind   Kind
	Detail string
}

func (e *Error) Error() string { return e.Detail }

func errorf(kind Kind, format string, args ...any) error {
	return &Error{Kind: kind, Detail: fmt.Sprintf(format, args...)}
}

type Service struct {
	Content *content.Index
	store   *repository.Store
	runner  Runner
	now     func() time.Time
}

func New(idx *content.Index, store *repository.Store, runner Runner) *Service {
	return &Service{Content: idx, store: store, runner: runner, now: time.Now}
}

// SetRunner remplace le runner (tests).
func (s *Service) SetRunner(r Runner) { s.runner = r }

func (s *Service) repos() repository.Repos { return s.store.Repos() }

// pyISO formate un horodatage comme datetime.isoformat() en Python (UTC, microsecondes si non nulles).
func pyISO(t time.Time) string {
	t = t.UTC()
	out := t.Format("2006-01-02T15:04:05")
	if us := t.Nanosecond() / 1000; us != 0 {
		out += fmt.Sprintf(".%06d", us)
	}
	return out + "+00:00"
}

func isoDate(d time.Time) string { return d.Format(time.DateOnly) }

// pyList formate une liste de chaînes comme repr() en Python : ['a', 'b'].
func pyList(items []string) string {
	quoted := make([]string, len(items))
	for i, s := range items {
		quoted[i] = "'" + strings.ReplaceAll(s, "'", `\'`) + "'"
	}
	return "[" + strings.Join(quoted, ", ") + "]"
}
