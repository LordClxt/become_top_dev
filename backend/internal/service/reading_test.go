package service

import (
	"context"
	"errors"
	"testing"

	"btd/backend/internal/content"
)

func TestSaveReadingValidates(t *testing.T) {
	s := &Service{Content: &content.Index{Lessons: map[string]*content.Lesson{"l1": {ID: "l1"}}}}
	cases := []struct {
		name, lesson, anchor string
		progress             float64
		kind                 Kind
	}{
		{"leçon inconnue", "nope", "a", 0.1, NotFound},
		{"ancre vide", "l1", "", 0.1, Invalid},
		{"ancre avec balise", "l1", "<script>", 0.1, Invalid},
		{"ancre en majuscules", "l1", "Le-Concept", 0.1, Invalid},
		{"progression négative", "l1", "le-concept", -0.1, Invalid},
		{"progression > 1", "l1", "le-concept", 1.01, Invalid},
	}
	for _, c := range cases {
		err := s.SaveReading(context.Background(), 1, c.lesson, c.anchor, c.progress)
		var e *Error
		if !errors.As(err, &e) || e.Kind != c.kind {
			t.Errorf("%s : erreur %v, attendu le type %v", c.name, err, c.kind)
		}
	}
}
