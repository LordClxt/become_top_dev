package api

import (
	"encoding/json"
	"net/http"
	"testing"
)

// passLesson valide une leçon comme le ferait un apprenant : chaque point de contrôle réussi du premier coup
// (le dernier valide la leçon), puis « Terminer » pour une leçon qui n'en a pas. Renvoie l'XP de la leçon.
func passLesson(t *testing.T, client *http.Client, base, lessonID string) int {
	t.Helper()
	l := loadContent(t).Lessons[lessonID]
	if l == nil {
		t.Fatalf("leçon inconnue : %s", lessonID)
	}
	xp := 0
	for _, c := range l.Checkpoints {
		var v struct {
			Correct         bool
			LessonCompleted *struct {
				XPAwarded int `json:"xp_awarded"`
			} `json:"lesson_completed"`
		}
		resp := do(t, client, http.MethodPost, base+"/api/lessons/"+lessonID+"/checkpoints/"+c.ID, jsonBody(map[string]any{"answer": c.Answer}))
		if err := json.NewDecoder(resp.Body).Decode(&v); err != nil || !v.Correct {
			t.Fatalf("point de contrôle %s/%s : %v %+v", lessonID, c.ID, err, v)
		}
		if v.LessonCompleted != nil {
			xp = v.LessonCompleted.XPAwarded
		}
	}
	if len(l.Checkpoints) == 0 {
		var v struct {
			XPAwarded int `json:"xp_awarded"`
		}
		resp := do(t, client, http.MethodPost, base+"/api/lessons/"+lessonID+"/complete", nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("terminer %s : %d", lessonID, resp.StatusCode)
		}
		_ = json.NewDecoder(resp.Body).Decode(&v)
		xp = v.XPAwarded
	}
	return xp
}
