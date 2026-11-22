package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"btd/backend/internal/service"
	"btd/backend/internal/testdb"
)

// Une question de quiz ratée et un point de contrôle révélé reviennent en révision, où l'on y répond pour de vrai.
func TestMistakesComeBackInReview(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	idx := loadContent(t)
	post := func(path string, body any) (int, map[string]any) {
		resp := do(t, client, http.MethodPost, srv.URL+path, jsonBody(body))
		var v map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&v)
		return resp.StatusCode, v
	}
	type queue struct {
		Tracked   int     `json:"tracked"`
		NextDueOn *string `json:"next_due_on"`
	}
	review := func() queue { return decode[queue](t, do(t, client, http.MethodGet, srv.URL+"/api/review", nil)) }

	quiz := idx.Quizzes["java-ch01-l01-quiz"]
	q := quiz.Questions[0]
	if _, v := post("/api/quizzes/"+quiz.ID+"/questions/"+q.ID, map[string]any{"answer": "?"}); v["correct"] != false {
		t.Fatalf("mauvaise réponse attendue : %v", v)
	}
	if _, v := post("/api/lessons/java-ch01-l02/checkpoints/c1", map[string]any{"answer": 0}); v["correct"] != false {
		t.Fatalf("mauvaise réponse au point de contrôle : %v", v)
	}
	tomorrow := time.Now().UTC().AddDate(0, 0, 1).Format(time.DateOnly)
	if r := review(); r.Tracked != 2 || r.NextDueOn == nil || *r.NextDueOn != tomorrow {
		t.Fatalf("deux erreurs en révision, à revoir demain (%s) : %+v", tomorrow, r)
	}

	card := "quiz:" + quiz.ID + "/" + q.ID
	if code, _ := post("/api/review/"+card, map[string]any{"rating": "known"}); code != http.StatusUnprocessableEntity && code != http.StatusBadRequest {
		t.Errorf("une carte question ne s'auto-évalue pas : %d", code)
	}
	if code, v := post("/api/review/"+card, map[string]any{"answer": "?"}); code != http.StatusOK || v["correct"] != false || v["box"] != float64(1) || v["explanation"] == "" {
		t.Errorf("erreur rejouée, encore fausse : %d %v", code, v)
	}
	if code, v := post("/api/review/"+card, map[string]any{"answer": q.Answer}); code != http.StatusOK || v["correct"] != true || v["box"] != float64(2) {
		t.Errorf("erreur rejouée, juste : %d %v", code, v)
	}
	if code, _ := post("/api/review/quiz:nope/q1", map[string]any{"answer": 1}); code != http.StatusNotFound {
		t.Errorf("carte question inconnue : %d", code)
	}
	if code, _ := post("/api/review/java-ch01-l01/fc1", map[string]any{"answer": 1}); code != http.StatusUnprocessableEntity && code != http.StatusBadRequest {
		t.Errorf("une carte mémo ne reçoit pas de réponse : %d", code)
	}
	// Une réponse demandée renvoie aussi la question en révision (sans doublon).
	post("/api/lessons/java-ch01-l02/checkpoints/c1/reveal", nil)
	if r := review(); r.Tracked != 2 {
		t.Errorf("pas de doublon : %+v", r)
	}
}

// Le lendemain, l'erreur est servie comme une question (sans la réponse), à côté des cartes mémo.
func TestDueMistakeIsServedAsQuestion(t *testing.T) {
	ctx := context.Background()
	idx := loadContent(t)
	svc := service.New(idx, testdb.Fresh(t), &fakeRunner{})
	if _, err := svc.EnsureOwner(ctx, adminEmail, adminPassword); err != nil {
		t.Fatal(err)
	}
	const uid = 1 // premier compte d'une base neuve
	quiz := idx.Quizzes["java-ch01-l01-quiz"]
	q := quiz.Questions[0]
	if r, err := svc.Answer(ctx, uid, quiz.ID, q.ID, "?"); err != nil || r.Correct {
		t.Fatalf("mauvaise réponse : %v %+v", err, r)
	}
	if _, err := svc.AnswerCheckpoint(ctx, uid, "java-ch01-l02", "c1", 0); err != nil {
		t.Fatal(err)
	}
	tomorrow := service.Date(time.Now().UTC().AddDate(0, 0, 1).Date())
	deck, err := svc.Review(ctx, uid, tomorrow, "UTC")
	if err != nil {
		t.Fatal(err)
	}
	if deck.DueCount != 2 || len(deck.Cards) != 2 {
		t.Fatalf("deux erreurs dues demain : %+v", deck)
	}
	got := deck.Cards[0]
	if got.Kind != "question" || got.Question == nil || got.LessonID == "" || got.Question.Prompt == "" || got.IsNew {
		t.Errorf("carte question : %+v", got)
	}
	raw, _ := json.Marshal(got)
	if strings.Contains(string(raw), `"answer"`) || strings.Contains(string(raw), "explanation") {
		t.Errorf("la réponse ne doit pas partir avec la carte : %s", raw)
	}
}
