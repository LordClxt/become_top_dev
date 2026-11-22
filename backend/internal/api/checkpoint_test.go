package api

import (
	"encoding/json"
	"net/http"
	"testing"
)

// Une leçon se valide par ses points de contrôle, et une réponse demandée ne rapporte plus d'XP.
func TestLessonIsValidatedByCheckpoints(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	const lessonID = "java-ch01-l02"
	l := loadContent(t).Lessons[lessonID]
	base := srv.URL + "/api/lessons/" + lessonID
	post := func(path string, body any) (int, map[string]any) {
		var raw []byte
		if body != nil {
			raw = jsonBody(body)
		}
		resp := do(t, client, http.MethodPost, base+path, raw)
		var v map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&v)
		return resp.StatusCode, v
	}
	lesson := func() map[string]any {
		var v map[string]any
		_ = json.NewDecoder(do(t, client, http.MethodGet, base, nil).Body).Decode(&v)
		return v
	}

	if code, v := post("/complete", nil); code != http.StatusConflict {
		t.Fatalf("« Terminer » sans point de contrôle réussi : %d %v", code, v)
	}
	if req := lesson()["requirement"].(map[string]any); req["kind"] != "checkpoints" || req["done"] != float64(0) || req["total"] != float64(3) {
		t.Errorf("requirement : %v", req)
	}

	c1, c2, c3 := l.Checkpoints[0], l.Checkpoints[1], l.Checkpoints[2]
	if code, _ := post("/checkpoints/"+c1.ID+"/reveal", nil); code != http.StatusConflict {
		t.Errorf("réponse demandée sans essai : %d", code)
	}
	if code, v := post("/checkpoints/"+c1.ID, map[string]any{"answer": 0}); code != http.StatusOK || v["correct"] != false {
		t.Fatalf("mauvaise réponse : %d %v", code, v)
	}
	if code, v := post("/checkpoints/"+c1.ID+"/reveal", nil); code != http.StatusOK || v["explanation"] == "" || v["expected"] == nil {
		t.Errorf("réponse demandée après un essai : %d %v", code, v)
	}
	if code, _ := post("/checkpoints/nope/reveal", nil); code != http.StatusNotFound {
		t.Errorf("point inconnu : %d", code)
	}
	if _, v := post("/checkpoints/"+c1.ID, map[string]any{"answer": c1.Answer}); v["correct"] != true || v["xp_awarded"] != float64(0) || v["revealed"] != true {
		t.Errorf("réussite après la réponse demandée : pas d'XP attendu, %v", v)
	}
	if _, v := post("/checkpoints/"+c2.ID, map[string]any{"answer": c2.Answer}); v["xp_awarded"] != float64(3) || v["lesson_completed"] != nil {
		t.Errorf("réussite du premier coup : %v", v)
	}
	_, v := post("/checkpoints/"+c3.ID, map[string]any{"answer": c3.Answer})
	done, _ := v["lesson_completed"].(map[string]any)
	if done == nil || done["xp_awarded"] != float64(l.XP) {
		t.Fatalf("le dernier point de contrôle valide la leçon : %v", v)
	}
	got := lesson()
	if got["completed"] != true || got["requirement"].(map[string]any)["done"] != float64(3) {
		t.Errorf("leçon validée : %v %v", got["completed"], got["requirement"])
	}
	if cp := got["checkpoints"].([]any)[0].(map[string]any); cp["revealed"] != true || cp["answered"] != true || cp["tried"] != true {
		t.Errorf("état du point 1 : %v", cp)
	}
	if code, v := post("/complete", nil); code != http.StatusOK || v["xp_awarded"] != float64(0) {
		t.Errorf("« Terminer » une leçon déjà validée : %d %v", code, v)
	}
	if _, v := post("/checkpoints/"+c3.ID, map[string]any{"answer": c3.Answer}); v["lesson_completed"] != nil || v["xp_awarded"] != float64(0) {
		t.Errorf("rejouer un point déjà réussi : %v", v)
	}
}
