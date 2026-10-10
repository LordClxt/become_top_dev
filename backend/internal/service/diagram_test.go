package service

import (
	"encoding/json"
	"slices"
	"strings"
	"testing"

	"btd/backend/internal/content"
)

// graph crée un bloc par nom (type = nom sans suffixe numérique) et une flèche par couple.
func graph(edges [][2]string, extra ...string) string {
	names := map[string]bool{}
	for _, e := range edges {
		names[e[0]], names[e[1]] = true, true
	}
	for _, n := range extra {
		names[n] = true
	}
	var sorted []string
	for n := range names {
		sorted = append(sorted, n)
	}
	slices.Sort(sorted)
	nodes := []map[string]string{}
	for _, n := range sorted {
		nodes = append(nodes, map[string]string{"id": n, "type": strings.TrimRight(n, "0123456789")})
	}
	links := []map[string]string{}
	for _, e := range edges {
		links = append(links, map[string]string{"source": e[0], "target": e[1]})
	}
	raw, _ := json.Marshal(map[string]any{"nodes": nodes, "edges": links})
	return string(raw)
}

func status(t *testing.T, raw string, c content.DiagramCheck) string {
	t.Helper()
	g, err := ParseGraph(raw)
	if err != nil {
		t.Fatal(err)
	}
	r, err := EvaluateDiagram(g, []content.DiagramCheck{c}, nil)
	if err != nil {
		t.Fatal(err)
	}
	return r.Tests[0].Status
}

func rule(name string, source, target, via string) content.DiagramCheck {
	return content.DiagramCheck{ID: name, Label: name, Rule: name, Source: source, Target: target, Via: via}
}

func expect(t *testing.T, raw string, c content.DiagramCheck, want string) {
	t.Helper()
	if got := status(t, raw, c); got != want {
		t.Errorf("%s sur %s : %s, attendu %s", c.Rule, raw, got, want)
	}
}

func TestPathViaRequiresEveryRouteToCrossVia(t *testing.T) {
	c := rule("path", "api", "db", "queue")
	expect(t, graph([][2]string{{"api", "queue"}, {"queue", "db"}}), c, "pass")
	expect(t, graph([][2]string{{"api", "queue"}, {"queue", "db"}, {"api", "db"}}), c, "fail") // contournement
	expect(t, graph([][2]string{{"api", "worker"}}, "db", "queue"), c, "fail")                 // aucun chemin
}

func TestInboundViaAndNoEdge(t *testing.T) {
	buffered := rule("inbound_via", "", "tracker", "queue")
	expect(t, graph([][2]string{{"a", "queue"}, {"queue", "tracker"}}), buffered, "pass")
	expect(t, graph([][2]string{{"a", "queue"}, {"queue", "tracker"}, {"b", "tracker"}}), buffered, "fail")
	stateless := rule("no_edge", "capture", "db", "")
	expect(t, graph([][2]string{{"capture", "queue"}}, "db"), stateless, "pass")
	expect(t, graph([][2]string{{"capture", "db"}}), stateless, "fail")
}

func TestSingleOwnerAndConnected(t *testing.T) {
	owner := rule("single_owner", "", "db", "")
	expect(t, graph([][2]string{{"svc1", "db1"}, {"svc2", "db2"}}), owner, "pass")
	expect(t, graph([][2]string{{"svc1", "db"}, {"svc2", "db"}}), owner, "fail")
	connected := rule("connected", "", "", "")
	expect(t, graph([][2]string{{"a", "b"}}), connected, "pass")
	expect(t, graph([][2]string{{"a", "b"}}, "c"), connected, "fail")
}

func TestRejectsMalformedGraphs(t *testing.T) {
	for _, raw := range []string{
		"pas du json",
		`{"nodes": [{"id": "a", "type": "x"}], "edges": [{"source": "a", "target": "z"}]}`,
		`{"nodes": [{"id": "a", "type": "x"}, {"id": "a", "type": "y"}]}`,
		`{"nodes": [{"id": 1, "type": "x"}]}`,
		`{"nodes": [{"type": "x"}]}`,
		`[]`,
	} {
		if _, err := ParseGraph(raw); err == nil {
			t.Errorf("%s aurait dû être refusé", raw)
		}
	}
}

func TestKataSolutionPassesAndStarterFails(t *testing.T) {
	idx, err := content.Load("../../../content")
	if err != nil {
		t.Fatal(err)
	}
	ex := idx.Exercises["arch-sandbox-ggg-bid-flow"]
	for side, want := range map[string]bool{"solution": true, "starter": false} {
		r, err := VerifyDiagramSide(ex.Path, side, ex.DiagramChecks, PaletteLabels(ex.Palette))
		if err != nil {
			t.Fatal(err)
		}
		if r.Passed != want {
			t.Errorf("%s : passed=%v, attendu %v", side, r.Passed, want)
		}
	}
}
