package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func login(t *testing.T, client *http.Client, base string) {
	t.Helper()
	resp, err := client.Post(base+"/api/auth/login", "application/json", strings.NewReader(`{"password":"secret-test"}`))
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

func TestSessionRejectsTamperedAndExpiredCookies(t *testing.T) {
	s := sessions{secret: []byte("k"), now: time.Now}
	rec := httptest.NewRecorder()
	s.issue(rec)
	cookie := rec.Result().Cookies()[0]

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(cookie)
	if !s.authenticated(req) {
		t.Fatal("le cookie émis doit être accepté")
	}

	tampered := httptest.NewRequest(http.MethodGet, "/", nil)
	tampered.AddCookie(&http.Cookie{Name: sessionCookie, Value: cookie.Value + "x"})
	if s.authenticated(tampered) {
		t.Error("une signature modifiée doit être refusée")
	}

	other := sessions{secret: []byte("autre"), now: time.Now}
	if other.authenticated(req) {
		t.Error("un cookie signé avec un autre secret doit être refusé")
	}

	later := sessions{secret: []byte("k"), now: func() time.Time { return time.Now().Add(31 * 24 * time.Hour) }}
	if later.authenticated(req) {
		t.Error("un cookie de plus de 30 jours doit être refusé")
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
		{http.MethodPut, "/api/exercises/go-ch02-l03-lab-chunk/draft", string(tooMany), http.StatusUnprocessableEntity},
		{http.MethodPut, "/api/exercises/go-ch02-l03-lab-chunk/draft", `{"files": {"chunk.go": 3}}`, http.StatusUnprocessableEntity},
		{http.MethodPost, "/api/quizzes/go-ch02-l03-quiz/questions/q1", `{}`, http.StatusUnprocessableEntity},
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
