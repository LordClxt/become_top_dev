package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"
)

func login(t *testing.T, client *http.Client, base string) {
	t.Helper()
	body := fmt.Sprintf(`{"email":%q,"password":%q}`, adminEmail, adminPassword)
	resp, err := client.Post(base+"/api/auth/login", "application/json", strings.NewReader(body))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("connexion : %v %v", err, resp)
	}
	resp.Body.Close()
}

func do(t *testing.T, client *http.Client, method, url string, body []byte) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(method, url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func TestAvatarRejectsOversizedUpload(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	png := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 2*1024*1024)...)
	if resp := do(t, client, http.MethodPut, srv.URL+"/api/profile/avatar", png); resp.StatusCode != http.StatusRequestEntityTooLarge {
		t.Errorf("avatar de plus de 2 Mo : statut %d", resp.StatusCode)
	}
}

func TestDiagramRunNeverCallsRunner(t *testing.T) {
	srv, runner := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	body, _ := json.Marshal(map[string]any{"files": map[string]string{"diagram.json": `{"nodes": [], "edges": []}`}})
	resp := do(t, client, http.MethodPost, srv.URL+"/api/exercises/arch-sandbox-ggg-bid-flow/run", body)
	if resp.StatusCode != http.StatusOK || len(runner.calls) != 0 {
		t.Errorf("statut %d, %d appels au runner", resp.StatusCode, len(runner.calls))
	}
}

func TestRequestValidation(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	files := map[string]string{}
	for i := range 21 {
		files[fmt.Sprintf("f%d.go", i)] = ""
	}
	tooMany, _ := json.Marshal(map[string]any{"files": files})
	cases := []struct {
		method, path string
		body         string
		want         int
	}{
		{http.MethodPut, "/api/exercises/java-ch01-l01-lab-http-status/draft", string(tooMany), http.StatusUnprocessableEntity},
		{http.MethodPut, "/api/exercises/java-ch01-l01-lab-http-status/draft", `{"files": {"HttpStatus.java": 3}}`, http.StatusUnprocessableEntity},
		{http.MethodPost, "/api/quizzes/java-ch01-l01-quiz/questions/q1", `{}`, http.StatusUnprocessableEntity},
		{http.MethodPost, "/api/auth/login", `{}`, http.StatusUnprocessableEntity},
		{http.MethodGet, "/api/activity/feed?day=hier", "", http.StatusUnprocessableEntity},
		{http.MethodGet, "/api/activity?tz=Local", "", http.StatusBadRequest},
		{http.MethodGet, "/api/nope", "", http.StatusNotFound},
	}
	for _, c := range cases {
		if resp := do(t, client, c.method, srv.URL+c.path, []byte(c.body)); resp.StatusCode != c.want {
			t.Errorf("%s %s : statut %d, attendu %d", c.method, c.path, resp.StatusCode, c.want)
		}
	}
}

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	return u
}

func TestLessonCheckpoints(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	getLesson := func() map[string]any {
		var v map[string]any
		if err := json.NewDecoder(do(t, client, http.MethodGet, srv.URL+"/api/lessons/java-ch01-l02", nil).Body).Decode(&v); err != nil {
			t.Fatal(err)
		}
		return v
	}
	cps, _ := getLesson()["checkpoints"].([]any)
	if len(cps) != 3 {
		t.Fatalf("3 points de contrôle attendus, %d", len(cps))
	}
	c1 := cps[0].(map[string]any)
	if _, leak := c1["answer"]; leak || c1["answered"] != false || c1["id"] != "c1" {
		t.Errorf("vue du point de contrôle : %v", c1)
	}
	answer := func(id, body string) map[string]any {
		resp := do(t, client, http.MethodPost, srv.URL+"/api/lessons/java-ch01-l02/checkpoints/"+id, []byte(body))
		var v map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&v)
		v["status"] = resp.StatusCode
		return v
	}
	if v := answer("c1", `{"answer": 0}`); v["correct"] != false || v["xp_awarded"] != float64(0) || v["expected"] != nil || v["explanation"] != "" {
		t.Errorf("mauvaise réponse (sans souffler la solution) : %v", v)
	}
	if v := answer("c1", `{"answer": 2}`); v["correct"] != true || v["xp_awarded"] != float64(3) || v["explanation"] == "" {
		t.Errorf("bonne réponse : %v", v)
	}
	if v := answer("c1", `{"answer": 2}`); v["xp_awarded"] != float64(0) {
		t.Errorf("l'XP ne se gagne qu'une fois : %v", v)
	}
	if v := answer("c2", `{"answer": "2 true\n"}`); v["correct"] != true {
		t.Errorf("code-output : %v", v)
	}
	cps = getLesson()["checkpoints"].([]any)
	if cps[0].(map[string]any)["answered"] != true || cps[2].(map[string]any)["answered"] != false {
		t.Errorf("answered : %v", cps)
	}
	if v := answer("zz", `{"answer": 1}`); v["status"] != http.StatusNotFound {
		t.Errorf("point de contrôle inconnu : %v", v)
	}
	if v := answer("c1", `{}`); v["status"] != http.StatusUnprocessableEntity {
		t.Errorf("answer manquant : %v", v)
	}
	if v := do(t, client, http.MethodPost, srv.URL+"/api/lessons/nope/checkpoints/c1", []byte(`{"answer": 1}`)); v.StatusCode != http.StatusNotFound {
		t.Errorf("leçon inconnue : %d", v.StatusCode)
	}
	// La maîtrise ne bouge pas, mais l'XP du jour compte les points de contrôle.
	var feed []map[string]any
	_ = json.NewDecoder(do(t, client, http.MethodGet, srv.URL+"/api/activity/feed", nil).Body).Decode(&feed)
	var act []map[string]any
	resp := do(t, client, http.MethodGet, srv.URL+"/api/activity", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("activité : %d", resp.StatusCode)
	}
	_ = json.NewDecoder(resp.Body).Decode(&act)
	total := 0.0
	for _, d := range act {
		x, _ := d["xp"].(float64)
		total += x
	}
	if total != 6 {
		t.Errorf("XP de l'activité = %v, attendu 6", total)
	}
}

func TestLessonCardsRated(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	rated := func() float64 {
		var v map[string]any
		if err := json.NewDecoder(do(t, client, http.MethodGet, srv.URL+"/api/lessons/java-ch01-l02", nil).Body).Decode(&v); err != nil {
			t.Fatal(err)
		}
		return v["cards_rated"].(float64)
	}
	if n := rated(); n != 0 {
		t.Fatalf("cards_rated initial : %v", n)
	}
	var l struct {
		Flashcards []struct{ ID string } `json:"flashcards"`
	}
	_ = json.NewDecoder(do(t, client, http.MethodGet, srv.URL+"/api/lessons/java-ch01-l02", nil).Body).Decode(&l)
	if len(l.Flashcards) == 0 {
		t.Skip("leçon sans cartes")
	}
	card := "java-ch01-l02/" + l.Flashcards[0].ID
	if resp := do(t, client, http.MethodPost, srv.URL+"/api/review/"+card, []byte(`{"rating":"known"}`)); resp.StatusCode != http.StatusOK {
		t.Fatalf("notation : statut %d", resp.StatusCode)
	}
	if n := rated(); n != 1 {
		t.Errorf("cards_rated après une note : %v", n)
	}
}
