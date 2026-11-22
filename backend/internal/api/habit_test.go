package api

import (
	"fmt"
	"net/http"
	"slices"
	"testing"

	"btd/backend/internal/content"
	"btd/backend/internal/service"
)

type todayResp struct {
	Date         string
	GoalXP       int  `json:"goal_xp"`
	XPToday      int  `json:"xp_today"`
	GoalMet      bool `json:"goal_met"`
	StreakDays   int  `json:"streak_days"`
	StreakAtRisk bool `json:"streak_at_risk"`
	Week         []struct {
		Date                    string
		XP                      int
		Active, GoalMet, Future bool
	}
	Quests []struct {
		ID             string
		Have, Need, XP int
		Done, Claimed  bool
	}
	Chest struct {
		Ready, Claimed bool
		XP             *int
	}
	ReviewDue int `json:"review_due"`
	Continue  *struct {
		Type, ID, Label string
	}
}

func loadContent(t *testing.T) *content.Index {
	t.Helper()
	idx, err := content.Load(contentDir)
	if err != nil {
		t.Fatal(err)
	}
	return idx
}

type xpResp struct {
	XPAwarded int `json:"xp_awarded"`
	Bonus     *service.Bonus
	Bonuses   []service.Bonus
}

func TestTodayQuestsAndChest(t *testing.T) {
	srv, runner := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	idx := loadContent(t)
	get := func() todayResp {
		return decode[todayResp](t, do(t, client, http.MethodGet, srv.URL+"/api/today?tz=Europe/Paris", nil))
	}

	v := get()
	if len(v.Quests) != 3 || len(v.Week) != 7 || v.GoalXP != 50 || v.XPToday != 0 || v.Chest.Ready || v.Chest.XP != nil ||
		v.Continue == nil || v.Continue.Type != "lesson" || v.Continue.Label != "Leçon suivante" {
		t.Fatalf("aujourd'hui, compte neuf : %+v", v)
	}
	future := 0
	for _, d := range v.Week {
		if d.Future {
			future++
		}
	}
	if v.Week[6-future].Date != v.Date {
		t.Errorf("aujourd'hui doit être le dernier jour non futur : %+v", v.Week)
	}
	claim := func(path string) *http.Response {
		return do(t, client, http.MethodPost, srv.URL+path+"?tz=Europe/Paris", nil)
	}
	if r := claim("/api/today/quests/" + v.Quests[0].ID + "/claim"); r.StatusCode != http.StatusConflict {
		t.Errorf("quête pas finie : %d", r.StatusCode)
	}
	if r := claim("/api/today/quests/nope/claim"); r.StatusCode != http.StatusNotFound {
		t.Errorf("quête inconnue : %d", r.StatusCode)
	}
	if r := claim("/api/today/chest/claim"); r.StatusCode != http.StatusConflict {
		t.Errorf("coffre fermé : %d", r.StatusCode)
	}

	// Une journée bien remplie valide toutes les quêtes possibles, quel que soit le tirage.
	passLesson(t, client, srv.URL, "java-ch01-l01")
	passLesson(t, client, srv.URL, "java-ch01-l02")
	runner.output = `{"Action":"pass","Test":"TestX"}`
	run := jsonBody(map[string]any{"files": map[string]string{"HttpStatus.java": "class X {}"}})
	for range 5 {
		do(t, client, http.MethodPost, srv.URL+"/api/exercises/java-ch01-l01-lab-http-status/run", run)
	}
	for _, q := range idx.Quizzes["java-ch01-l01-quiz"].Questions {
		do(t, client, http.MethodPost, srv.URL+"/api/quizzes/java-ch01-l01-quiz/questions/"+q.ID, jsonBody(map[string]any{"answer": q.Answer}))
	}
	c1 := idx.Lessons["java-ch01-l02"].Checkpoints[0]
	do(t, client, http.MethodPost, srv.URL+"/api/lessons/java-ch01-l02/checkpoints/"+c1.ID, jsonBody(map[string]any{"answer": c1.Answer}))

	v = get()
	learning := v.XPToday
	if !v.GoalMet || !v.Chest.Ready || v.StreakDays != 1 || v.StreakAtRisk {
		t.Fatalf("après la journée : %+v", v)
	}
	for _, q := range v.Quests {
		if !q.Done || q.Have != q.Need {
			t.Errorf("quête %s : %d/%d", q.ID, q.Have, q.Need)
		}
		r := claim("/api/today/quests/" + q.ID + "/claim")
		if got := decode[xpResp](t, r); r.StatusCode != http.StatusOK || got.XPAwarded != q.XP {
			t.Errorf("réclamer %s : %d %+v", q.ID, r.StatusCode, got)
		}
		if r := claim("/api/today/quests/" + q.ID + "/claim"); r.StatusCode != http.StatusConflict {
			t.Errorf("réclamer deux fois %s : %d", q.ID, r.StatusCode)
		}
	}
	r := claim("/api/today/chest/claim")
	chest := decode[xpResp](t, r)
	if r.StatusCode != http.StatusOK || chest.XPAwarded < 20 || chest.XPAwarded > 60 || chest.XPAwarded%5 != 0 {
		t.Errorf("coffre : %d %+v", r.StatusCode, chest)
	}
	if r := claim("/api/today/chest/claim"); r.StatusCode != http.StatusConflict {
		t.Errorf("coffre deux fois : %d", r.StatusCode)
	}
	v = get()
	if v.XPToday != learning || v.Chest.XP == nil || *v.Chest.XP != chest.XPAwarded || !v.Chest.Claimed {
		t.Errorf("quêtes et coffre ne comptent pas dans l'objectif : %d puis %d, coffre %+v", learning, v.XPToday, v.Chest)
	}
	for _, q := range v.Quests {
		if !q.Claimed {
			t.Errorf("%s devrait être réclamée", q.ID)
		}
	}
}

func TestBonuses(t *testing.T) {
	srv, runner := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	idx := loadContent(t)
	ex := idx.Exercises["java-ch01-l01-lab-http-status"]
	runPath := srv.URL + "/api/exercises/" + ex.ID + "/run"
	run := jsonBody(map[string]any{"files": map[string]string{"HttpStatus.java": "class X {}"}})

	runner.output = `{"Action":"pass","Test":"TestX"}`
	first := decode[xpResp](t, do(t, client, http.MethodPost, runPath, run))
	bonus := service.FirstTryXP(ex.XP)
	if len(first.Bonuses) != 1 || first.Bonuses[0].ID != "first_try" || first.Bonuses[0].XP != bonus || first.XPAwarded != ex.XP+bonus {
		t.Errorf("premier coup : %+v", first)
	}
	again := decode[xpResp](t, do(t, client, http.MethodPost, runPath, run))
	if again.Bonuses == nil || len(again.Bonuses) != 0 || again.XPAwarded != 0 {
		t.Errorf("deuxième réussite : %+v", again)
	}

	// Raté puis réussi : pas de bonus.
	other := "java-ch01-l01-lab-warmup-temperature"
	files := map[string]string{}
	for _, f := range idx.Exercises[other].FilesEditable {
		files[f] = "x"
	}
	runner.output = `{"Action":"fail","Test":"TestX"}`
	do(t, client, http.MethodPost, srv.URL+"/api/exercises/"+other+"/run", jsonBody(map[string]any{"files": files}))
	runner.output = `{"Action":"pass","Test":"TestX"}`
	if v := decode[xpResp](t, do(t, client, http.MethodPost, srv.URL+"/api/exercises/"+other+"/run", jsonBody(map[string]any{"files": files}))); len(v.Bonuses) != 0 {
		t.Errorf("pas de bonus au deuxième essai : %+v", v)
	}

	answer := func(quiz, q string, a any) xpResp {
		return decode[xpResp](t, do(t, client, http.MethodPost, srv.URL+"/api/quizzes/"+quiz+"/questions/"+q, jsonBody(map[string]any{"answer": a})))
	}
	qs := idx.Quizzes["java-ch01-l01-quiz"].Questions
	for i, q := range qs {
		got := answer("java-ch01-l01-quiz", q.ID, q.Answer)
		if i < len(qs)-1 && got.Bonus != nil {
			t.Errorf("bonus trop tôt à %s", q.ID)
		}
		if i == len(qs)-1 && (got.Bonus == nil || got.Bonus.ID != "quiz_perfect" || got.XPAwarded != service.QuizXPPerQuestion+service.QuizPerfectXP) {
			t.Errorf("sans faute : %+v", got)
		}
	}
	if got := answer("java-ch01-l01-quiz", qs[0].ID, qs[0].Answer); got.Bonus != nil || got.XPAwarded != 0 {
		t.Errorf("le bonus ne tombe qu'une fois : %+v", got)
	}

	// Une erreur en première tentative empêche le sans-faute.
	qs2 := idx.Quizzes["java-ch01-l02-quiz"].Questions
	answer("java-ch01-l02-quiz", qs2[0].ID, "faux")
	for _, q := range qs2 {
		if got := answer("java-ch01-l02-quiz", q.ID, q.Answer); got.Bonus != nil {
			t.Errorf("pas de sans-faute après une erreur : %+v", got)
		}
	}
}

type reviewCardResp struct {
	ID          string
	LessonID    string `json:"lesson_id"`
	LessonTitle string `json:"lesson_title"`
	CourseTitle string `json:"course_title"`
	Box         int
	IsNew       bool `json:"is_new"`
}

func TestReviewFlow(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	idx := loadContent(t)
	type queue struct {
		Cards     []reviewCardResp
		DueCount  int     `json:"due_count"`
		NewCount  int     `json:"new_count"`
		NextDueOn *string `json:"next_due_on"`
		Tracked   int
	}
	get := func() queue { return decode[queue](t, do(t, client, http.MethodGet, srv.URL+"/api/review", nil)) }
	if q := get(); q.Cards == nil || len(q.Cards) != 0 || q.NewCount != 0 || q.NextDueOn != nil {
		t.Fatalf("rien à réviser sans leçon terminée : %+v", q)
	}
	passLesson(t, client, srv.URL, "java-ch01-l01")
	q := get()
	want := min(service.NewCardsPerDay, len(idx.Lessons["java-ch01-l01"].Flashcards))
	if q.NewCount != want || len(q.Cards) != want || !q.Cards[0].IsNew || q.Cards[0].ID != "java-ch01-l01/fc1" ||
		q.Cards[0].LessonID != "java-ch01-l01" || q.Cards[0].LessonTitle == "" || q.Cards[0].CourseTitle == "" {
		t.Fatalf("nouvelles cartes : %+v", q)
	}
	rate := func(card, rating string) *http.Response {
		return do(t, client, http.MethodPost, srv.URL+"/api/review/"+card, jsonBody(map[string]string{"rating": rating}))
	}
	type result struct {
		Box       int
		DueOn     string `json:"due_on"`
		XPAwarded int    `json:"xp_awarded"`
	}
	r1 := decode[result](t, rate("java-ch01-l01/fc1", "known"))
	r2 := decode[result](t, rate("java-ch01-l01/fc1", "known"))
	r3 := decode[result](t, rate("java-ch01-l01/fc1", "review"))
	if r1.Box != 1 || r1.XPAwarded != 1 || r2.Box != 2 || r2.XPAwarded != 0 || r3.Box != 1 || r3.DueOn != r1.DueOn {
		t.Errorf("Leitner : %+v %+v %+v", r1, r2, r3)
	}
	if r := rate("java-ch01-l01/nope", "known"); r.StatusCode != http.StatusNotFound {
		t.Errorf("carte inconnue : %d", r.StatusCode)
	}
	if r := rate("java-ch01-l01/fc2", "maybe"); r.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("note invalide : %d", r.StatusCode)
	}
	// Carte d'une leçon pas terminée : acceptée (entraînement depuis la leçon).
	cards := idx.Lessons["java-ch01-l04"].Flashcards
	if r := rate("java-ch01-l04/"+cards[0].ID, "known"); r.StatusCode != http.StatusOK {
		t.Errorf("carte d'une leçon non terminée : %d", r.StatusCode)
	}
	q = get()
	if q.Tracked != 2 || q.DueCount != 0 || q.NextDueOn == nil || *q.NextDueOn != r1.DueOn || q.NewCount != min(service.NewCardsPerDay-2, len(idx.Lessons["java-ch01-l01"].Flashcards)-1) ||
		slices.ContainsFunc(q.Cards, func(c reviewCardResp) bool {
			return c.ID == "java-ch01-l01/fc1"
		}) {
		t.Errorf("après révision : %+v", q)
	}
}

func TestLeaderboardAndGoal(t *testing.T) {
	srv, _ := newTestServer(t)
	admin := newClient(t)
	login(t, admin, srv.URL)
	ada := signup(t, srv.URL, "ada@example.com")
	passLesson(t, ada, srv.URL, "java-ch01-l01")

	type board struct {
		WeekStart string `json:"week_start"`
		Entries   []struct {
			UserID    int64 `json:"user_id"`
			XPWeek    int   `json:"xp_week"`
			XPTotal   int   `json:"xp_total"`
			Level     int
			Streak    int  `json:"streak_days"`
			HasAvatar bool `json:"has_avatar"`
			Me        bool
		}
	}
	b := decode[board](t, do(t, admin, http.MethodGet, srv.URL+"/api/leaderboard?tz=Europe/Paris", nil))
	if len(b.Entries) != 2 || b.Entries[0].UserID == 1 || b.Entries[0].XPWeek == 0 || b.Entries[0].Streak != 1 ||
		b.Entries[0].Me || !b.Entries[1].Me || b.WeekStart == "" {
		t.Fatalf("classement : %+v", b)
	}

	png := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 16)...)
	do(t, admin, http.MethodPut, srv.URL+"/api/profile/avatar", png)
	if r := do(t, ada, http.MethodGet, srv.URL+"/api/users/1/avatar", nil); r.StatusCode != http.StatusOK ||
		r.Header.Get("Content-Type") != "image/png" || r.Header.Get("Cache-Control") == "" {
		t.Errorf("avatar d'un membre : %d %v", r.StatusCode, r.Header)
	}
	adaID := b.Entries[0].UserID
	if r := do(t, admin, http.MethodGet, srv.URL+fmt.Sprintf("/api/users/%d/avatar", adaID), nil); r.StatusCode != http.StatusNotFound {
		t.Errorf("pas d'avatar : %d", r.StatusCode)
	}
	if b := decode[board](t, do(t, ada, http.MethodGet, srv.URL+"/api/leaderboard", nil)); !b.Entries[1].HasAvatar {
		t.Errorf("has_avatar : %+v", b)
	}

	for goal, want := range map[string]int{`{"goal_xp": 100}`: 204, `{"goal_xp": 30}`: 422, `{}`: 422} {
		if r := do(t, ada, http.MethodPut, srv.URL+"/api/profile/goal", []byte(goal)); r.StatusCode != want {
			t.Errorf("objectif %s : %d", goal, r.StatusCode)
		}
	}
	type profile struct {
		Goal int `json:"daily_goal_xp"`
	}
	if p := decode[profile](t, do(t, ada, http.MethodGet, srv.URL+"/api/profile", nil)); p.Goal != 100 {
		t.Errorf("profil : %+v", p)
	}
	if p := decode[profile](t, do(t, admin, http.MethodGet, srv.URL+"/api/profile", nil)); p.Goal != 50 {
		t.Errorf("profil avec avatar seulement : %+v", p)
	}
	if v := decode[todayResp](t, do(t, ada, http.MethodGet, srv.URL+"/api/today", nil)); v.GoalXP != 100 {
		t.Errorf("objectif dans aujourd'hui : %d", v.GoalXP)
	}
}
