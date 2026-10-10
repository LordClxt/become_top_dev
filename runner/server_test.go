package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakeExecutor struct {
	image   string
	timeout time.Duration
}

func (f *fakeExecutor) Run(_ context.Context, image string, _ map[string]string, _ string, timeout time.Duration) (RunResult, error) {
	f.image, f.timeout = image, timeout
	return RunResult{ExitCode: 0, Output: "ok", DurationMs: 1}, nil
}

func testConfig() Config {
	return Config{Token: "t", Images: map[string]string{"go": "img-go"}, MaxConcurrentRuns: 1, MaxTimeoutS: 120}
}

func post(t *testing.T, h http.Handler, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/run", bytes.NewReader(raw))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func runBody(files map[string]string) map[string]any {
	return map[string]any{"language": "go", "files": files, "command": "go test ./...", "timeout_s": 300}
}

func TestHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	NewServer(testConfig(), &fakeExecutor{}).Routes().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ok"`) {
		t.Fatalf("health : %d %s", rec.Code, rec.Body)
	}
}

func TestRejectsBadToken(t *testing.T) {
	h := NewServer(testConfig(), &fakeExecutor{}).Routes()
	for _, token := range []string{"", "wrong"} {
		if rec := post(t, h, token, runBody(nil)); rec.Code != http.StatusUnauthorized {
			t.Errorf("token %q : statut %d, attendu 401", token, rec.Code)
		}
	}
}

func TestRejectsInvalidRequests(t *testing.T) {
	h := NewServer(testConfig(), &fakeExecutor{}).Routes()
	cases := map[string]map[string]any{
		"path traversal": runBody(map[string]string{"../evil.go": "x"}),
		"nested escape":  runBody(map[string]string{"a/../../evil.go": "x"}),
		"absolute path":  runBody(map[string]string{"/etc/passwd": "x"}),
		"empty path":     runBody(map[string]string{"": "x"}),
		"zero timeout":   {"language": "go", "files": map[string]string{}, "command": "true", "timeout_s": 0},
		"long command":   {"language": "go", "files": map[string]string{}, "command": strings.Repeat("x", 501), "timeout_s": 1},
	}
	for name, body := range cases {
		if rec := post(t, h, "t", body); rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s : statut %d, attendu 422", name, rec.Code)
		}
	}
	unknown := map[string]any{"language": "cobol", "files": map[string]string{}, "command": "true", "timeout_s": 1}
	if rec := post(t, h, "t", unknown); rec.Code != http.StatusBadRequest {
		t.Errorf("langage inconnu : statut %d, attendu 400", rec.Code)
	}
}

func TestRunUsesImageAndCapsTimeout(t *testing.T) {
	exec := &fakeExecutor{}
	rec := post(t, NewServer(testConfig(), exec).Routes(), "t", runBody(map[string]string{"tests/a_test.go": "x"}))
	if rec.Code != http.StatusOK {
		t.Fatalf("statut %d : %s", rec.Code, rec.Body)
	}
	var res RunResult
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil || res.Output != "ok" {
		t.Fatalf("réponse inattendue : %s", rec.Body)
	}
	if exec.image != "img-go" || exec.timeout != 120*time.Second {
		t.Errorf("image %q, timeout %v", exec.image, exec.timeout)
	}
}

func TestParseBytes(t *testing.T) {
	for in, want := range map[string]int64{"512m": 512 << 20, "1g": 1 << 30, "64K": 64 << 10, "100": 100} {
		if got, err := parseBytes(in); err != nil || got != want {
			t.Errorf("parseBytes(%q) = %d, %v ; attendu %d", in, got, err, want)
		}
	}
	for _, in := range []string{"", "m", "-1m", "abc"} {
		if _, err := parseBytes(in); err == nil {
			t.Errorf("parseBytes(%q) aurait dû échouer", in)
		}
	}
}
