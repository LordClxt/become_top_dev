package service

import (
	"testing"
	"time"

	"btd/backend/internal/content"
	"btd/backend/internal/model"
)

// La maîtrise exige le boss : un score au-dessus du seuil ne suffit pas tant qu'il n'est pas battu.
func TestMasteryRequiresBoss(t *testing.T) {
	threshold := 0.8
	s := &Service{Content: &content.Index{
		Lessons: map[string]*content.Lesson{"l1": {ID: "l1", Labs: []string{"lab"}}},
	}}
	ch := &content.Chapter{ID: "ch", LessonIDs: []string{"l1"}, BossID: "boss", MasteryThreshold: &threshold}
	now := time.Now()
	passed := func(ids ...string) map[string]model.ExerciseProgress {
		out := map[string]model.ExerciseProgress{}
		for _, id := range ids {
			out[id] = model.ExerciseProgress{ExerciseID: id, PassedAt: &now}
		}
		return out
	}

	m := s.mastery(ch, passed("lab"), nil, nil)
	if m.Score != 1 || m.BossTotal != 1 || m.BossPassed || m.Mastered {
		t.Errorf("score plein, boss pas battu : %+v", m)
	}
	m = s.mastery(ch, passed("lab", "boss"), nil, nil)
	if !m.BossPassed || !m.Mastered {
		t.Errorf("boss battu : %+v", m)
	}
	m = s.mastery(ch, passed("boss"), nil, nil)
	if m.Mastered {
		t.Errorf("le boss seul ne suffit pas, le score compte aussi : %+v", m)
	}
	ch.BossID = ""
	if m = s.mastery(ch, passed("lab"), nil, nil); m.BossTotal != 0 || !m.Mastered {
		t.Errorf("module sans boss : %+v", m)
	}
}
