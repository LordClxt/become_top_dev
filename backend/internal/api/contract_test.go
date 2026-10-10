package api

// Rejoue le contrat enregistré sur le backend Python (testdata/contract) et compare chaque réponse.
// Régénérer la référence : cd backend && uv run python -m tests.record_contract

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"maps"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"reflect"
	"regexp"
	"slices"
	"sort"
	"strings"
	"sync"
	"testing"

	"btd/backend/internal/content"
	"btd/backend/internal/service"
	"btd/backend/internal/testdb"
)

const contentDir = "../../../content"

func TestMain(m *testing.M) {
	slog.SetDefault(slog.New(slog.DiscardHandler)) // pas de journal des requêtes dans la sortie des tests
	os.Exit(m.Run())
}

type fakeRunner struct {
	mu       sync.Mutex
	exitCode int
	output   string
	calls    []runnerCall
}

type runnerCall struct {
	Language string
	Files    map[string]string
	Command  string
}

func (f *fakeRunner) Run(_ context.Context, language string, files map[string]string, command string, _ int) (service.RunResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, runnerCall{language, files, command})
	return service.RunResult{ExitCode: f.exitCode, Output: f.output, DurationMs: 42}, nil
}

// newTestServer démarre l'API complète sur une base vide, avec le vrai contenu et un faux runner.
func newTestServer(t *testing.T) (*httptest.Server, *fakeRunner) {
	t.Helper()
	idx, err := content.Load(contentDir)
	if err != nil {
		t.Fatal(err)
	}
	runner := &fakeRunner{}
	svc := service.New(idx, testdb.Fresh(t), runner)
	srv := httptest.NewServer(New(svc, Config{AppPassword: "secret-test", SessionSecret: "test-secret"}))
	t.Cleanup(srv.Close)
	return srv, runner
}

func newClient(t *testing.T) *http.Client {
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	return &http.Client{Jar: jar}
}

type step struct {
	Name    string          `json:"name"`
	Method  string          `json:"method"`
	Path    string          `json:"path"`
	JSON    json.RawMessage `json:"json"`
	BodyB64 *string         `json:"body_b64"`
	Select  string          `json:"select"`
	Runner  *struct {
		ExitCode int    `json:"exit_code"`
		Output   string `json:"output"`
	} `json:"runner"`
}

func readJSON(t *testing.T, path string, dst any) {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, dst); err != nil {
		t.Fatal(err)
	}
}

func TestContract(t *testing.T) {
	var steps []step
	var golden []map[string]any
	readJSON(t, "../../testdata/contract/scenario.json", &steps)
	readJSON(t, "../../testdata/contract/golden.json", &golden)
	if len(steps) != len(golden) {
		t.Fatalf("%d étapes pour %d réponses de référence", len(steps), len(golden))
	}

	srv, runner := newTestServer(t)
	client := newClient(t)
	for i, s := range steps {
		if s.Runner != nil {
			runner.exitCode, runner.output = s.Runner.ExitCode, s.Runner.Output
		}
		var body io.Reader
		req, err := http.NewRequest(s.Method, srv.URL+s.Path, nil)
		if err != nil {
			t.Fatal(err)
		}
		switch {
		case s.JSON != nil:
			body = bytes.NewReader(s.JSON)
			req.Header.Set("Content-Type", "application/json")
		case s.BodyB64 != nil:
			raw, _ := base64.StdEncoding.DecodeString(*s.BodyB64)
			body = bytes.NewReader(raw)
		}
		if body != nil {
			req, _ = http.NewRequest(s.Method, srv.URL+s.Path, body)
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		got := record(t, s, resp, runner)
		resp.Body.Close()

		if diff := firstDiff(golden[i], got, ""); diff != "" {
			t.Errorf("%s : %s", s.Name, diff)
		}
	}
}

// record reproduit tests/record_contract.py : ce qui est comparé pour chaque étape.
func record(t *testing.T, s step, resp *http.Response, runner *fakeRunner) map[string]any {
	t.Helper()
	raw, _ := io.ReadAll(resp.Body)
	out := map[string]any{"name": s.Name, "status": resp.StatusCode}
	ctype := resp.Header.Get("Content-Type")
	switch {
	case s.Select == "status" || resp.StatusCode == http.StatusNoContent:
	case resp.StatusCode >= 400:
		var e struct{ Detail any }
		_ = json.Unmarshal(raw, &e)
		if d, ok := e.Detail.(string); ok && resp.StatusCode != http.StatusUnprocessableEntity {
			out["detail"] = d
		}
	case strings.HasPrefix(ctype, "application/json"):
		var body any
		if err := json.Unmarshal(raw, &body); err != nil {
			t.Fatalf("%s : JSON invalide : %v", s.Name, err)
		}
		if list, ok := body.([]any); ok && s.Select == "last" {
			body = list[len(list)-1]
		}
		out["body"] = normalize(body)
	default:
		out["content_type"] = ctype
		out["body_b64"] = base64.StdEncoding.EncodeToString(raw)
	}
	runner.mu.Lock()
	defer runner.mu.Unlock()
	if s.Runner != nil && len(runner.calls) > 0 {
		call := runner.calls[len(runner.calls)-1]
		var sent struct{ Files map[string]string }
		_ = json.Unmarshal(s.JSON, &sent)
		editable := map[string]any{}
		for k := range sent.Files {
			if v, ok := call.Files[k]; ok {
				editable[k] = v
			}
		}
		files := slices.Sorted(maps.Keys(call.Files))
		out["runner_call"] = map[string]any{
			"language": call.Language, "command": call.Command, "files": files, "editable": editable,
		}
	}
	runner.calls = nil

	// Même forme que le JSON de référence (nombres en float64, listes en []any).
	encoded, _ := json.Marshal(out)
	var normalized map[string]any
	_ = json.Unmarshal(encoded, &normalized)
	return normalized
}

var (
	datetimeRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}`)
	dateRe     = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	masked     = map[string]bool{"avatar_version": true, "duration_ms": true}
)

// normalize masque ce qui dépend de l'heure ou de la machine. Même règle que record_contract.py.
func normalize(v any) any {
	switch t := v.(type) {
	case map[string]any:
		out := map[string]any{}
		for k, val := range t {
			if masked[k] && val != nil {
				out[k] = "<int>"
			} else {
				out[k] = normalize(val)
			}
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, val := range t {
			out[i] = normalize(val)
		}
		return out
	case string:
		if datetimeRe.MatchString(t) {
			return "<datetime>"
		}
		if dateRe.MatchString(t) {
			return "<date>"
		}
	}
	return v
}

// firstDiff décrit la première différence entre la référence et la réponse, ou "" si elles sont égales.
func firstDiff(want, got any, path string) string {
	switch w := want.(type) {
	case map[string]any:
		g, ok := got.(map[string]any)
		if !ok {
			return fmt.Sprintf("%s : objet attendu, reçu %s", path, short(got))
		}
		keys := map[string]bool{}
		for k := range w {
			keys[k] = true
		}
		for k := range g {
			keys[k] = true
		}
		sorted := make([]string, 0, len(keys))
		for k := range keys {
			sorted = append(sorted, k)
		}
		sort.Strings(sorted)
		for _, k := range sorted {
			wv, inW := w[k]
			gv, inG := g[k]
			switch {
			case !inW:
				return fmt.Sprintf("%s.%s : clé en trop (%s)", path, k, short(gv))
			case !inG:
				return fmt.Sprintf("%s.%s : clé manquante (attendu %s)", path, k, short(wv))
			}
			if d := firstDiff(wv, gv, path+"."+k); d != "" {
				return d
			}
		}
		return ""
	case []any:
		g, ok := got.([]any)
		if !ok {
			return fmt.Sprintf("%s : liste attendue, reçu %s", path, short(got))
		}
		if len(w) != len(g) {
			return fmt.Sprintf("%s : %d éléments attendus, reçu %d", path, len(w), len(g))
		}
		for i := range w {
			if d := firstDiff(w[i], g[i], fmt.Sprintf("%s[%d]", path, i)); d != "" {
				return d
			}
		}
		return ""
	}
	if !reflect.DeepEqual(want, got) {
		return fmt.Sprintf("%s : attendu %s, reçu %s", path, short(want), short(got))
	}
	return ""
}

func short(v any) string {
	raw, _ := json.Marshal(v)
	if len(raw) > 160 {
		return string(raw[:160]) + "…"
	}
	return string(raw)
}
