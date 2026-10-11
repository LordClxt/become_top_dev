package service

import (
	"slices"
	"testing"

	"btd/backend/internal/content"
)

func eval(t *testing.T, raw string, c content.DiagramCheck) TestCase {
	t.Helper()
	g, err := ParseGraph(raw)
	if err != nil {
		t.Fatal(err)
	}
	r, err := EvaluateDiagram(g, []content.DiagramCheck{c}, map[string]string{"redis": "Redis", "pg": "PostgreSQL", "page": "Page"})
	if err != nil {
		t.Fatal(err)
	}
	return r.Tests[0]
}

func ptr(n int) *int { return &n }

func TestParseGraphV2(t *testing.T) {
	g, err := ParseGraph(`{"nodes":[{"id":"z","type":"zone","x":0,"y":0},
	  {"id":"a","type":"redis","x":10,"y":20,"label":"Sessions","parent":"z","props":{"role":"cache","n":3}}],
	  "edges":[{"id":"e1","source":"a","target":"z","kind":"read","label":"GET"},{"source":"z","target":"a"}]}`)
	if err != nil {
		t.Fatal(err)
	}
	n := g.Nodes[1]
	if n.Label != "Sessions" || n.Parent != "z" || n.Props["role"] != "cache" || n.Props["n"] != "3" || n.X != 10 {
		t.Errorf("nœud mal lu : %+v", n)
	}
	if g.Edges[0].Kind != "read" || g.Edges[1].Kind != "sync" || g.Edges[0].Label != "GET" {
		t.Errorf("flèches mal lues : %+v", g.Edges)
	}
	for name, raw := range map[string]string{
		"nature inconnue":   `{"nodes":[{"id":"a","type":"x"}],"edges":[{"source":"a","target":"a","kind":"magie"}]}`,
		"zone inexistante":  `{"nodes":[{"id":"a","type":"x","parent":"nope"}]}`,
		"son propre parent": `{"nodes":[{"id":"a","type":"x","parent":"a"}]}`,
	} {
		if _, err := ParseGraph(raw); err == nil {
			t.Errorf("%s : une erreur est attendue", name)
		}
	}
}

func TestPropRule(t *testing.T) {
	c := content.DiagramCheck{ID: "p", Label: "p", Rule: "prop", Source: "redis", Prop: "role", Value: "cache"}
	ok := `{"nodes":[{"id":"r","type":"redis","props":{"role":"cache"}}]}`
	if tc := eval(t, ok, c); tc.Status != "pass" {
		t.Errorf("%+v", tc)
	}
	bad := `{"nodes":[{"id":"r","type":"redis","props":{"role":"queue"}}]}`
	if tc := eval(t, bad, c); tc.Status != "fail" || !slices.Equal(tc.Refs, []string{"r"}) {
		t.Errorf("rôle erroné : %+v", tc)
	}
	if tc := eval(t, `{"nodes":[{"id":"r","type":"redis"}]}`, c); tc.Status != "fail" {
		t.Errorf("propriété absente : %+v", tc)
	}
	if tc := eval(t, `{"nodes":[]}`, c); tc.Status != "fail" || tc.Output != "Aucun bloc « Redis » sur le diagramme." {
		t.Errorf("aucun bloc : %+v", tc)
	}
}

func TestEdgeKindRule(t *testing.T) {
	c := content.DiagramCheck{ID: "k", Label: "k", Rule: "edge_kind", Source: "pg", Target: "redis", Kind: "replication"}
	nodes := `"nodes":[{"id":"a","type":"pg"},{"id":"b","type":"redis"}]`
	if tc := eval(t, `{`+nodes+`,"edges":[{"id":"e","source":"a","target":"b","kind":"replication"}]}`, c); tc.Status != "pass" {
		t.Errorf("%+v", tc)
	}
	tc := eval(t, `{`+nodes+`,"edges":[{"id":"e","source":"a","target":"b"}]}`, c)
	if tc.Status != "fail" || !slices.Equal(tc.Refs, []string{"e"}) {
		t.Errorf("nature erronée : %+v", tc)
	}
	if tc := eval(t, `{`+nodes+`}`, c); tc.Status != "fail" {
		t.Errorf("aucune flèche : %+v", tc)
	}
}

func TestCountRule(t *testing.T) {
	two := `{"nodes":[{"id":"a","type":"pg"},{"id":"b","type":"pg"}]}`
	if tc := eval(t, two, content.DiagramCheck{ID: "c", Label: "c", Rule: "count", Source: "pg", Min: ptr(2)}); tc.Status != "pass" {
		t.Errorf("%+v", tc)
	}
	if tc := eval(t, two, content.DiagramCheck{ID: "c", Label: "c", Rule: "count", Source: "pg", Min: ptr(3)}); tc.Status != "fail" {
		t.Errorf("trop peu : %+v", tc)
	}
	if tc := eval(t, two, content.DiagramCheck{ID: "c", Label: "c", Rule: "count", Source: "pg", Max: ptr(1)}); tc.Status != "fail" || len(tc.Refs) != 2 {
		t.Errorf("trop : %+v", tc)
	}
}

func TestInZoneRule(t *testing.T) {
	c := content.DiagramCheck{ID: "z", Label: "z", Rule: "in_zone", Source: "pg", Target: "zone"}
	in := `{"nodes":[{"id":"z","type":"zone"},{"id":"a","type":"pg","parent":"z"}]}`
	if tc := eval(t, in, c); tc.Status != "pass" {
		t.Errorf("%+v", tc)
	}
	out := `{"nodes":[{"id":"z","type":"zone"},{"id":"a","type":"pg"}]}`
	if tc := eval(t, out, c); tc.Status != "fail" || !slices.Equal(tc.Refs, []string{"a"}) {
		t.Errorf("hors zone : %+v", tc)
	}
}

// Un B-tree à trois pages : la racine « 30 » et deux feuilles « 10 20 » et « 30 40 » (la clé 30 va à droite).
func treeCheck() content.DiagramCheck {
	return content.DiagramCheck{ID: "t", Label: "t", Rule: "tree_shape", Source: "page", Tree: &content.TreeSpec{
		Keys: "30", Children: []content.TreeSpec{{Keys: "10 20"}, {Keys: "30 40"}},
	}}
}

func TestTreeShape(t *testing.T) {
	good := `{"nodes":[
	  {"id":"r","type":"page","x":100,"y":0,"props":{"keys":"30"}},
	  {"id":"r1","type":"page","x":200,"y":100,"props":{"keys":"30, 40"}},
	  {"id":"r0","type":"page","x":0,"y":100,"props":{"keys":"10 20"}}],
	  "edges":[{"source":"r","target":"r1"},{"source":"r","target":"r0"}]}`
	if tc := eval(t, good, treeCheck()); tc.Status != "pass" {
		t.Errorf("l'ordre des enfants se lit de gauche à droite, pas dans l'ordre des flèches : %+v", tc)
	}
	swapped := `{"nodes":[
	  {"id":"r","type":"page","x":100,"y":0,"props":{"keys":"30"}},
	  {"id":"a","type":"page","x":0,"y":100,"props":{"keys":"30 40"}},
	  {"id":"b","type":"page","x":200,"y":100,"props":{"keys":"10 20"}}],
	  "edges":[{"source":"r","target":"a"},{"source":"r","target":"b"}]}`
	if tc := eval(t, swapped, treeCheck()); tc.Status != "fail" {
		t.Errorf("enfants échangés : %+v", tc)
	}
	wrongKeys := `{"nodes":[
	  {"id":"r","type":"page","props":{"keys":"30"}},
	  {"id":"a","type":"page","x":0,"props":{"keys":"10 25"}},
	  {"id":"b","type":"page","x":9,"props":{"keys":"30 40"}}],
	  "edges":[{"source":"r","target":"a"},{"source":"r","target":"b"}]}`
	if tc := eval(t, wrongKeys, treeCheck()); tc.Status != "fail" || !slices.Equal(tc.Refs, []string{"a"}) {
		t.Errorf("clés erronées : %+v", tc)
	}
	twoRoots := `{"nodes":[{"id":"a","type":"page","props":{"keys":"30"}},{"id":"b","type":"page","props":{"keys":"1"}}]}`
	if tc := eval(t, twoRoots, treeCheck()); tc.Status != "fail" {
		t.Errorf("deux racines : %+v", tc)
	}
	cycle := `{"nodes":[{"id":"a","type":"page"},{"id":"b","type":"page"}],"edges":[{"source":"a","target":"b"},{"source":"b","target":"a"}]}`
	if tc := eval(t, cycle, treeCheck()); tc.Status != "fail" {
		t.Errorf("cycle : %+v", tc)
	}
	if tc := eval(t, `{"nodes":[]}`, treeCheck()); tc.Status != "fail" {
		t.Errorf("vide : %+v", tc)
	}
}

func TestV1RulesStillReportRefs(t *testing.T) {
	raw := `{"nodes":[{"id":"a","type":"x"},{"id":"b","type":"y"}],"edges":[{"source":"a","target":"b"}]}`
	tc := eval(t, raw, content.DiagramCheck{ID: "n", Label: "n", Rule: "no_edge", Source: "x", Target: "y"})
	if tc.Status != "fail" || !slices.Equal(tc.Refs, []string{"a", "b"}) {
		t.Errorf("%+v", tc)
	}
}

func TestLinkRule(t *testing.T) {
	c := content.DiagramCheck{ID: "l", Label: "l", Rule: "link", Source: "Idaho", Target: "United States", Value: "within"}
	nodes := `"nodes":[{"id":"a","type":"place","label":"idaho "},{"id":"b","type":"place","label":"United states"}]`
	ok := eval(t, `{`+nodes+`,"edges":[{"id":"e","source":"a","target":"b","label":"WITHIN"}]}`, c)
	if ok.Status != "pass" {
		t.Errorf("casse et espaces ignorés : %+v", ok)
	}
	bad := eval(t, `{`+nodes+`,"edges":[{"id":"e","source":"a","target":"b","label":"inside"}]}`, c)
	if bad.Status != "fail" || !slices.Equal(bad.Refs, []string{"e"}) {
		t.Errorf("mauvaise étiquette : %+v", bad)
	}
	wrongWay := eval(t, `{`+nodes+`,"edges":[{"id":"e","source":"b","target":"a","label":"within"}]}`, c)
	if wrongWay.Status != "fail" || len(wrongWay.Refs) != 2 {
		t.Errorf("mauvais sens : %+v", wrongWay)
	}
	if tc := eval(t, `{"nodes":[]}`, c); tc.Status != "fail" || tc.Output != "Aucun bloc nommé « Idaho »." {
		t.Errorf("bloc absent : %+v", tc)
	}
}

func TestConnectedIgnoresZonesThatContainBlocks(t *testing.T) {
	c := content.DiagramCheck{ID: "c", Label: "c", Rule: "connected"}
	raw := `{"nodes":[{"id":"z","type":"zone"},{"id":"a","type":"x","parent":"z"},{"id":"b","type":"x","parent":"z"}],"edges":[{"source":"a","target":"b"}]}`
	if tc := eval(t, raw, c); tc.Status != "pass" {
		t.Errorf("une zone non reliée qui contient des blocs ne doit pas compter comme isolée : %+v", tc)
	}
	empty := `{"nodes":[{"id":"z","type":"zone"},{"id":"a","type":"x"},{"id":"b","type":"x"}],"edges":[{"source":"a","target":"b"}]}`
	if tc := eval(t, empty, c); tc.Status != "fail" {
		t.Errorf("une zone vide est un bloc isolé : %+v", tc)
	}
}
