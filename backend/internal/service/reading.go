package service

import (
	"context"
	"math"
	"regexp"
)

// Reprise de lecture : la dernière section lue d'une leçon, pour y revenir à la séance suivante.

// ReadingView est la position de lecture d'une leçon, renvoyée avec la leçon et le « Continuer ».
type ReadingView struct {
	Anchor   string  `json:"anchor"`   // id du titre de section (slug) en haut de l'écran
	Progress float64 `json:"progress"` // avancement de la lecture, de 0 à 1
}

// anchorRe est la forme des ancres produites par le lecteur (slug des titres ## et ###).
var anchorRe = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// SaveReading enregistre la position de lecture d'une leçon.
func (s *Service) SaveReading(ctx context.Context, uid int64, lessonID, anchor string, progress float64) error {
	if s.Content.Lessons[lessonID] == nil {
		return errorf(NotFound, "leçon introuvable")
	}
	if len(anchor) > 120 || !anchorRe.MatchString(anchor) {
		return errorf(Invalid, "anchor : identifiant de section invalide")
	}
	if math.IsNaN(progress) || progress < 0 || progress > 1 {
		return errorf(Invalid, "progress : nombre entre 0 et 1 attendu")
	}
	return s.repos().Progress(uid).SaveReading(ctx, lessonID, anchor, progress)
}

// readingOf renvoie la position de lecture d'une leçon, ou nil si elle n'a jamais été ouverte.
func (s *Service) readingOf(ctx context.Context, uid int64, lessonID string) (*ReadingView, error) {
	all, err := s.repos().Progress(uid).Readings(ctx)
	if err != nil {
		return nil, err
	}
	x, ok := all[lessonID]
	if !ok {
		return nil, nil
	}
	// REAL en base : 0.4 revient en 0.39999998, d'où l'arrondi au centième.
	return &ReadingView{Anchor: x.Anchor, Progress: math.Round(x.Progress*100) / 100}, nil
}
