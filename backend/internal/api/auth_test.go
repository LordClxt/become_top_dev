package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"
)

func decode[T any](t *testing.T, resp *http.Response) T {
	t.Helper()
	var v T
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

func jsonBody(v any) []byte {
	raw, _ := json.Marshal(v)
	return raw
}

// invite crée une invitation avec le client de l'admin et renvoie son code.
func invite(t *testing.T, admin *http.Client, base string) string {
	t.Helper()
	resp := do(t, admin, http.MethodPost, base+"/api/admin/invites", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("création d'invitation : statut %d", resp.StatusCode)
	}
	return decode[struct{ Code string }](t, resp).Code
}

// signup inscrit un nouveau compte avec un code d'invitation et renvoie son client connecté.
func signup(t *testing.T, base, code, email string) *http.Client {
	t.Helper()
	client := newClient(t)
	resp := do(t, client, http.MethodPost, base+"/api/auth/signup", jsonBody(map[string]string{
		"code": code, "email": email, "display_name": "Ada", "password": "un-long-mot-de-passe",
	}))
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("inscription de %s : statut %d", email, resp.StatusCode)
	}
	return client
}

func TestSignupNeedsAValidSingleUseInvite(t *testing.T) {
	srv, _ := newTestServer(t)
	admin := newClient(t)
	login(t, admin, srv.URL)
	code := invite(t, admin, srv.URL)

	body := func(code, email string) []byte {
		return jsonBody(map[string]string{"code": code, "email": email, "display_name": "Ada", "password": "un-long-mot-de-passe"})
	}
	anon := newClient(t)
	if resp := do(t, anon, http.MethodPost, srv.URL+"/api/auth/signup", body("FAUXCODE", "ada@example.com")); resp.StatusCode != http.StatusBadRequest {
		t.Errorf("code inconnu : statut %d", resp.StatusCode)
	}
	if resp := do(t, anon, http.MethodPost, srv.URL+"/api/auth/signup", body(code, "ADMIN@test.local")); resp.StatusCode != http.StatusConflict {
		t.Errorf("email déjà pris (casse différente) : statut %d", resp.StatusCode)
	}
	// L'échec précédent n'a pas consommé le code ; le format recopié (tirets, minuscules) est accepté.
	pretty := fmt.Sprintf("%s-%s-%s", code[:4], code[4:8], code[8:])
	resp := do(t, anon, http.MethodPost, srv.URL+"/api/auth/signup", body(pretty, " Ada@Example.com "))
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("inscription valide : statut %d", resp.StatusCode)
	}
	me := decode[meResponse](t, do(t, anon, http.MethodGet, srv.URL+"/api/auth/me", nil))
	if !me.Authenticated || me.User.Email != "ada@example.com" || me.User.IsAdmin {
		t.Errorf("après inscription : %+v %+v", me, me.User)
	}
	if resp := do(t, newClient(t), http.MethodPost, srv.URL+"/api/auth/signup", body(code, "bob@example.com")); resp.StatusCode != http.StatusBadRequest {
		t.Errorf("code déjà utilisé : statut %d", resp.StatusCode)
	}

	invites := decode[[]struct{ Code, Status string }](t, do(t, admin, http.MethodGet, srv.URL+"/api/admin/invites", nil))
	if len(invites) != 1 || invites[0].Status != "used" {
		t.Errorf("invitations : %+v", invites)
	}
}

func TestProgressIsPerUser(t *testing.T) {
	srv, runner := newTestServer(t)
	admin := newClient(t)
	login(t, admin, srv.URL)
	ada := signup(t, srv.URL, invite(t, admin, srv.URL), "ada@example.com")

	do(t, admin, http.MethodPost, srv.URL+"/api/lessons/go-ch02-l03/complete", nil)
	do(t, admin, http.MethodPut, srv.URL+"/api/exercises/go-ch02-l03-lab-chunk/draft",
		jsonBody(map[string]any{"files": map[string]string{"chunk.go": "brouillon de l'admin"}}))
	runner.output = `{"Action":"pass","Test":"TestChunkValues"}`
	do(t, admin, http.MethodPost, srv.URL+"/api/exercises/go-ch02-l03-lab-chunk/run",
		jsonBody(map[string]any{"files": map[string]string{"chunk.go": "package lab"}}))

	type progress struct{ XP int }
	if p := decode[progress](t, do(t, admin, http.MethodGet, srv.URL+"/api/progress", nil)); p.XP == 0 {
		t.Fatal("l'admin devrait avoir de l'XP")
	}
	if p := decode[progress](t, do(t, ada, http.MethodGet, srv.URL+"/api/progress", nil)); p.XP != 0 {
		t.Errorf("Ada voit l'XP de l'admin : %d", p.XP)
	}
	ex := decode[struct {
		Workspace struct {
			Editable map[string]string
			Attempts int
			Passed   bool
		}
	}](t, do(t, ada, http.MethodGet, srv.URL+"/api/exercises/go-ch02-l03-lab-chunk", nil))
	if ws := ex.Workspace; ws.Passed || ws.Attempts != 0 || ws.Editable["chunk.go"] == "package lab" {
		t.Errorf("Ada voit le TP de l'admin : %+v", ex)
	}
	// La même leçon rapporte de l'XP à chacun : l'unicité de l'XP est par compte.
	got := decode[struct {
		XPAwarded int `json:"xp_awarded"`
	}](t, do(t, ada, http.MethodPost, srv.URL+"/api/lessons/go-ch02-l03/complete", nil))
	if got.XPAwarded == 0 {
		t.Error("Ada doit gagner l'XP d'une leçon déjà terminée par l'admin")
	}
}

func TestAdminRoutesNeedAdmin(t *testing.T) {
	srv, _ := newTestServer(t)
	admin := newClient(t)
	login(t, admin, srv.URL)
	ada := signup(t, srv.URL, invite(t, admin, srv.URL), "ada@example.com")
	for _, path := range []string{"/api/admin/invites", "/api/admin/members"} {
		if resp := do(t, ada, http.MethodGet, srv.URL+path, nil); resp.StatusCode != http.StatusForbidden {
			t.Errorf("%s par un membre : statut %d", path, resp.StatusCode)
		}
		if resp := do(t, newClient(t), http.MethodGet, srv.URL+path, nil); resp.StatusCode != http.StatusUnauthorized {
			t.Errorf("%s sans session : statut %d", path, resp.StatusCode)
		}
	}
	members := decode[[]struct{ Email string }](t, do(t, admin, http.MethodGet, srv.URL+"/api/admin/members", nil))
	if len(members) != 2 {
		t.Errorf("membres : %+v", members)
	}
}

func TestChangePasswordClosesOtherSessions(t *testing.T) {
	srv, _ := newTestServer(t)
	here, elsewhere := newClient(t), newClient(t)
	login(t, here, srv.URL)
	login(t, elsewhere, srv.URL)

	change := func(current, next string) int {
		return do(t, here, http.MethodPut, srv.URL+"/api/auth/password",
			jsonBody(map[string]string{"current": current, "new": next})).StatusCode
	}
	if got := change("faux", "un-nouveau-mot-de-passe"); got != http.StatusBadRequest {
		t.Errorf("mot de passe actuel faux : statut %d", got)
	}
	if got := change(adminPassword, "court"); got != http.StatusBadRequest {
		t.Errorf("nouveau mot de passe trop court : statut %d", got)
	}
	if got := change(adminPassword, "un-nouveau-mot-de-passe"); got != http.StatusNoContent {
		t.Fatalf("changement : statut %d", got)
	}
	if resp := do(t, here, http.MethodGet, srv.URL+"/api/progress", nil); resp.StatusCode != http.StatusOK {
		t.Errorf("la session courante doit rester ouverte : statut %d", resp.StatusCode)
	}
	if resp := do(t, elsewhere, http.MethodGet, srv.URL+"/api/progress", nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("les autres sessions doivent être fermées : statut %d", resp.StatusCode)
	}
	old := jsonBody(map[string]string{"email": adminEmail, "password": adminPassword})
	if resp := do(t, newClient(t), http.MethodPost, srv.URL+"/api/auth/login", old); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("l'ancien mot de passe doit être refusé : statut %d", resp.StatusCode)
	}
}

func TestLogoutRevokesTheSession(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	stolen := client.Jar.Cookies(mustURL(t, srv.URL))
	do(t, client, http.MethodPost, srv.URL+"/api/auth/logout", nil)

	replay := newClient(t)
	replay.Jar.SetCookies(mustURL(t, srv.URL), stolen)
	if resp := do(t, replay, http.MethodGet, srv.URL+"/api/progress", nil); resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("un cookie copié avant la déconnexion doit être refusé : statut %d", resp.StatusCode)
	}
}

func TestRunsAreRateLimitedPerUser(t *testing.T) {
	srv, runner := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	runner.output = `{"Action":"fail","Test":"TestChunkValues"}`
	body := jsonBody(map[string]any{"files": map[string]string{"chunk.go": "package lab"}})
	for i := range 10 {
		if resp := do(t, client, http.MethodPost, srv.URL+"/api/exercises/go-ch02-l03-lab-chunk/run", body); resp.StatusCode != http.StatusOK {
			t.Fatalf("exécution %d : statut %d", i+1, resp.StatusCode)
		}
	}
	if resp := do(t, client, http.MethodPost, srv.URL+"/api/exercises/go-ch02-l03-lab-chunk/run", body); resp.StatusCode != http.StatusTooManyRequests {
		t.Errorf("11e exécution dans la minute : statut %d", resp.StatusCode)
	}
	if len(runner.calls) != 10 {
		t.Errorf("le runner doit être appelé 10 fois, pas %d", len(runner.calls))
	}
}

func TestLimiterWindow(t *testing.T) {
	now := time.Now()
	l := newLimiter(2, time.Minute)
	l.now = func() time.Time { return now }
	if !l.allow("a") || !l.allow("a") || l.allow("a") {
		t.Error("2 tentatives autorisées, la 3e refusée")
	}
	if !l.allow("b") {
		t.Error("les clés sont indépendantes")
	}
	now = now.Add(time.Minute)
	if !l.allow("a") {
		t.Error("une nouvelle fenêtre repart de zéro")
	}
}
