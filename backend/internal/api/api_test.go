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

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	return u
}
