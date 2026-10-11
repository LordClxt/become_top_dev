package service

// Exercices de diagramme : on vérifie un graphe d'architecture (blocs + flèches) contre des règles déclaratives.
//
// Le graphe est un JSON produit par l'éditeur de nœuds :
//
//	{"nodes": [{"id": "n1", "type": "bid-capture", "x": 0, "y": 0}], "edges": [{"source": "n1", "target": "n2"}]}
//
// Une flèche va de l'appelant vers l'appelé, dans le sens où circulent les données.
// Aucun code n'est exécuté : la vérification se fait dans le process API.

import (
	"cmp"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"

	"btd/backend/internal/content"
)

const (
	maxNodes = 80
	maxEdges = 240
)

// Node est un bloc posé sur le diagramme.
type Node struct {
	ID     string
	Type   string
	X, Y   float64
	Label  string
	Parent string // id de la zone qui contient ce bloc, ou ""
	Props  map[string]string
}

// Edge est une flèche. Kind : sync | async | replication | read | write (vide : sync).
type Edge struct {
	ID, Source, Target, Kind, Label string
}

type Graph struct {
	Nodes []Node
	Edges []Edge
}

// ParseGraph lit et contrôle un diagramme (formats v1 et v2). Les erreurs sont destinées à l'utilisateur.
func ParseGraph(raw string) (Graph, error) {
	var wire struct {
		Nodes []struct {
			ID     *string        `json:"id"`
			Type   *string        `json:"type"`
			X      float64        `json:"x"`
			Y      float64        `json:"y"`
			Label  string         `json:"label"`
			Parent string         `json:"parent"`
			Props  map[string]any `json:"props"`
		} `json:"nodes"`
		Edges []struct {
			ID     string  `json:"id"`
			Source *string `json:"source"`
			Target *string `json:"target"`
			Kind   string  `json:"kind"`
			Label  string  `json:"label"`
		} `json:"edges"`
	}
	if err := json.Unmarshal([]byte(raw), &wire); err != nil {
		return Graph{}, fmt.Errorf("diagramme illisible : %w", err)
	}
	var g Graph
	for i, n := range wire.Nodes {
		if n.ID == nil || n.Type == nil {
			return Graph{}, fmt.Errorf("diagramme illisible : le bloc n°%d n'a pas d'id ou de type", i+1)
		}
		props := map[string]string{}
		for k, v := range n.Props {
			props[k] = fmt.Sprint(v)
		}
		g.Nodes = append(g.Nodes, Node{ID: *n.ID, Type: *n.Type, X: n.X, Y: n.Y, Label: n.Label, Parent: n.Parent, Props: props})
	}
	for i, e := range wire.Edges {
		if e.Source == nil || e.Target == nil {
			return Graph{}, fmt.Errorf("diagramme illisible : la flèche n°%d n'a pas de source ou de cible", i+1)
		}
		kind := e.Kind
		if kind == "" {
			kind = "sync"
		}
		if !slices.Contains(content.EdgeKinds, kind) {
			return Graph{}, fmt.Errorf("diagramme illisible : la flèche n°%d a une nature inconnue (%s)", i+1, kind)
		}
		g.Edges = append(g.Edges, Edge{ID: e.ID, Source: *e.Source, Target: *e.Target, Kind: kind, Label: e.Label})
	}
	if len(g.Nodes) > maxNodes || len(g.Edges) > maxEdges {
		return Graph{}, fmt.Errorf("diagramme trop grand (max %d blocs, %d flèches)", maxNodes, maxEdges)
	}
	ids := map[string]bool{}
	for _, n := range g.Nodes {
		ids[n.ID] = true
	}
	if len(ids) != len(g.Nodes) {
		return Graph{}, errors.New("deux blocs portent le même id")
	}
	for _, n := range g.Nodes {
		if n.Parent != "" && (!ids[n.Parent] || n.Parent == n.ID) {
			return Graph{}, errors.New("un bloc est posé dans une zone qui n'existe pas")
		}
	}
	for _, e := range g.Edges {
		if !ids[e.Source] || !ids[e.Target] {
			return Graph{}, errors.New("une flèche relie un bloc qui n'existe pas")
		}
	}
	return g, nil
}

// view donne des accès pratiques au graphe : types, successeurs, prédécesseurs.
type view struct {
	order []string // ids dans l'ordre du diagramme
	node  map[string]Node
	typ   map[string]string
	succ  map[string]map[string]bool
	pred  map[string]map[string]bool
	edges []Edge
}

func newView(g Graph) *view {
	v := &view{node: map[string]Node{}, typ: map[string]string{}, succ: map[string]map[string]bool{},
		pred: map[string]map[string]bool{}, edges: g.Edges}
	for _, n := range g.Nodes {
		v.order = append(v.order, n.ID)
		v.node[n.ID] = n
		v.typ[n.ID] = n.Type
		v.succ[n.ID], v.pred[n.ID] = map[string]bool{}, map[string]bool{}
	}
	for _, e := range g.Edges {
		if e.Source != e.Target {
			v.succ[e.Source][e.Target] = true
			v.pred[e.Target][e.Source] = true
		}
	}
	return v
}

func (v *view) of(t string) []string {
	var out []string
	for _, id := range v.order {
		if v.typ[id] == t {
			out = append(out, id)
		}
	}
	return out
}

// edgeRef identifie une flèche pour le surlignage : son id, à défaut « source>target ».
func edgeRef(e Edge) string {
	if e.ID != "" {
		return e.ID
	}
	return e.Source + ">" + e.Target
}

// reachable renvoie les blocs atteignables depuis starts. Avec avoidThrough, on ne traverse jamais un bloc de ce type.
func (v *view) reachable(starts []string, avoidThrough string) map[string]bool {
	seen := map[string]bool{}
	for _, s := range starts {
		seen[s] = true
	}
	queue := slices.Clone(starts)
	for len(queue) > 0 {
		n := queue[0]
		queue = queue[1:]
		for _, m := range sortedKeys(v.succ[n]) {
			if seen[m] {
				continue
			}
			seen[m] = true
			if avoidThrough == "" || v.typ[m] != avoidThrough {
				queue = append(queue, m)
			}
		}
	}
	return seen
}

// problem est ce qui manque à une règle : un message en français et les blocs/flèches fautifs (pour le surlignage).
type problem struct {
	msg  string
	refs []string
}

func fail(refs []string, format string, a ...any) *problem {
	return &problem{msg: fmt.Sprintf(format, a...), refs: refs}
}

// check renvoie nil si la règle est respectée, sinon ce qui manque.
func (v *view) check(c content.DiagramCheck, labels map[string]string) (*problem, error) {
	name := func(t string) string {
		if l, ok := labels[t]; ok {
			return l
		}
		return t
	}
	none := func(t string) *problem { return fail(nil, "Aucun bloc « %s » sur le diagramme.", name(t)) }
	switch c.Rule {
	case "path":
		froms, tos := v.of(c.Source), v.of(c.Target)
		if len(froms) == 0 {
			return none(c.Source), nil
		}
		if len(tos) == 0 {
			return none(c.Target), nil
		}
		reached := v.reachable(froms, "")
		if !slices.ContainsFunc(tos, func(t string) bool { return reached[t] }) {
			return fail(append(slices.Clone(froms), tos...), "Aucun chemin de « %s » vers « %s ».", name(c.Source), name(c.Target)), nil
		}
		if c.Via != "" {
			// Tous les chemins doivent traverser Via : on cherche une cible atteignable en l'évitant.
			if len(v.of(c.Via)) == 0 {
				return none(c.Via), nil
			}
			bypass := v.reachable(froms, c.Via)
			for _, t := range tos {
				if bypass[t] && !slices.Contains(froms, t) {
					return fail([]string{t}, "Un chemin va de « %s » à « %s » sans passer par « %s ».",
						name(c.Source), name(c.Target), name(c.Via)), nil
				}
			}
		}
		return nil, nil

	case "no_edge":
		for _, a := range v.of(c.Source) {
			for _, b := range sortedKeys(v.succ[a]) {
				if v.typ[b] == c.Target {
					return fail([]string{a, b}, "Une flèche relie directement « %s » à « %s ».", name(c.Source), name(c.Target)), nil
				}
			}
		}
		return nil, nil

	case "inbound_via":
		targets := v.of(c.Target)
		if len(targets) == 0 {
			return none(c.Target), nil
		}
		for _, t := range targets {
			if len(v.pred[t]) == 0 {
				return fail([]string{t}, "Rien n'arrive dans « %s ».", name(c.Target)), nil
			}
			for _, p := range sortedKeys(v.pred[t]) {
				if v.typ[p] != c.Via {
					return fail([]string{p, t}, "« %s » entre dans « %s » sans passer par « %s ».",
						name(v.typ[p]), name(c.Target), name(c.Via)), nil
				}
			}
		}
		return nil, nil

	case "single_owner":
		for _, n := range v.of(c.Target) {
			if len(v.pred[n]) > 1 {
				var owners []string
				for p := range v.pred[n] {
					owners = append(owners, name(v.typ[p]))
				}
				slices.Sort(owners)
				return fail(append([]string{n}, sortedKeys(v.pred[n])...), "Une « %s » est partagée par : %s.",
					name(c.Target), strings.Join(owners, ", ")), nil
			}
		}
		return nil, nil

	case "connected":
		zones := map[string]bool{} // une zone qui contient des blocs n'a pas besoin de flèches
		for _, n := range v.node {
			if n.Parent != "" {
				zones[n.Parent] = true
			}
		}
		for _, n := range v.order {
			if zones[n] {
				continue
			}
			if len(v.succ[n]) == 0 && len(v.pred[n]) == 0 {
				return fail([]string{n}, "« %s » n'est relié à rien.", name(v.typ[n])), nil
			}
		}
		return nil, nil

	case "prop":
		nodes := v.of(c.Source)
		if len(nodes) == 0 {
			return none(c.Source), nil
		}
		for _, n := range nodes {
			if got := v.node[n].Props[c.Prop]; got != c.Value {
				if got == "" {
					got = "rien"
				}
				return fail([]string{n}, "« %s » doit avoir %s = %s (il a %s).", name(c.Source), c.Prop, c.Value, got), nil
			}
		}
		return nil, nil

	case "edge_kind":
		var matching []Edge
		for _, e := range v.edges {
			if v.typ[e.Source] == c.Source && v.typ[e.Target] == c.Target {
				matching = append(matching, e)
			}
		}
		if len(matching) == 0 {
			return fail(nil, "Aucune flèche de « %s » vers « %s ».", name(c.Source), name(c.Target)), nil
		}
		for _, e := range matching {
			if e.Kind != c.Kind {
				return fail([]string{edgeRef(e)}, "La flèche de « %s » vers « %s » doit être de nature « %s » (elle est « %s »).",
					name(c.Source), name(c.Target), c.Kind, e.Kind), nil
			}
		}
		return nil, nil

	case "count":
		n := len(v.of(c.Source))
		if c.Min != nil && n < *c.Min {
			return fail(nil, "Il faut au moins %d « %s » (il y en a %d).", *c.Min, name(c.Source), n), nil
		}
		if c.Max != nil && n > *c.Max {
			return fail(v.of(c.Source), "Il faut au plus %d « %s » (il y en a %d).", *c.Max, name(c.Source), n), nil
		}
		return nil, nil

	case "in_zone":
		nodes := v.of(c.Source)
		if len(nodes) == 0 {
			return none(c.Source), nil
		}
		for _, n := range nodes {
			parent := v.node[n].Parent
			if parent == "" || v.typ[parent] != c.Target {
				return fail([]string{n}, "« %s » doit être posé dans une zone « %s ».", name(c.Source), name(c.Target)), nil
			}
		}
		return nil, nil

	case "tree_shape":
		return v.checkTree(c, name)

	case "link":
		return v.checkLink(c), nil
	}
	return nil, fmt.Errorf("règle inconnue : %s", c.Rule)
}

// byLabel renvoie les blocs dont le nom vaut label, sans tenir compte de la casse ni des espaces autour.
func (v *view) byLabel(label string) []string {
	var out []string
	for _, id := range v.order {
		if strings.EqualFold(strings.TrimSpace(v.node[id].Label), strings.TrimSpace(label)) {
			out = append(out, id)
		}
	}
	return out
}

// checkLink vérifie qu'une flèche étiquetée relie deux blocs désignés par leur nom.
func (v *view) checkLink(c content.DiagramCheck) *problem {
	froms, tos := v.byLabel(c.Source), v.byLabel(c.Target)
	if len(froms) == 0 {
		return fail(nil, "Aucun bloc nommé « %s ».", c.Source)
	}
	if len(tos) == 0 {
		return fail(nil, "Aucun bloc nommé « %s ».", c.Target)
	}
	want := strings.ToLower(strings.TrimSpace(c.Value))
	var wrong []string
	for _, e := range v.edges {
		if slices.Contains(froms, e.Source) && slices.Contains(tos, e.Target) {
			if strings.ToLower(strings.TrimSpace(e.Label)) == want {
				return nil
			}
			wrong = append(wrong, edgeRef(e))
		}
	}
	if len(wrong) > 0 {
		return fail(wrong, "La flèche de « %s » vers « %s » doit s'appeler « %s ».", c.Source, c.Target, c.Value)
	}
	return fail(append(slices.Clone(froms), tos...), "Il manque la flèche « %s » de « %s » vers « %s ».", c.Value, c.Source, c.Target)
}

var keySep = regexp.MustCompile(`[\s,;]+`)

// treeKeys lit les clés d'une page : « 10, 20 » et « 10 20 » valent la même suite.
func treeKeys(s string) []string {
	var out []string
	for _, k := range keySep.Split(strings.TrimSpace(s), -1) {
		if k != "" {
			out = append(out, k)
		}
	}
	return out
}

// checkTree compare les blocs de type c.Source (reliés parent → enfant) à l'arbre attendu.
func (v *view) checkTree(c content.DiagramCheck, name func(string) string) (*problem, error) {
	pages := v.of(c.Source)
	if len(pages) == 0 {
		return fail(nil, "Aucun bloc « %s » sur le diagramme.", name(c.Source)), nil
	}
	childrenOf := func(id string) []string {
		var kids []string
		for k := range v.succ[id] {
			if v.typ[k] == c.Source {
				kids = append(kids, k)
			}
		}
		slices.SortFunc(kids, func(a, b string) int {
			na, nb := v.node[a], v.node[b]
			switch {
			case na.X != nb.X:
				return cmp.Compare(na.X, nb.X)
			case na.Y != nb.Y:
				return cmp.Compare(na.Y, nb.Y)
			}
			return strings.Compare(a, b)
		})
		return kids
	}
	var roots []string
	for _, p := range pages {
		hasParent := false
		for q := range v.pred[p] {
			if v.typ[q] == c.Source {
				hasParent = true
			}
		}
		if !hasParent {
			roots = append(roots, p)
		}
	}
	switch {
	case len(roots) == 0:
		return fail(pages, "Les pages forment une boucle : il faut une racine d'où partent les flèches."), nil
	case len(roots) > 1:
		return fail(roots, "Il y a %d pages sans parent : l'arbre doit avoir une seule racine.", len(roots)), nil
	}
	visited := map[string]bool{}
	var compare func(id string, want content.TreeSpec) *problem
	compare = func(id string, want content.TreeSpec) *problem {
		if visited[id] {
			return fail([]string{id}, "Une page est atteinte par deux chemins : ce n'est pas un arbre.")
		}
		visited[id] = true
		got := treeKeys(v.node[id].Props["keys"])
		exp := treeKeys(want.Keys)
		if !slices.Equal(got, exp) {
			return fail([]string{id}, "Une page devrait contenir les clés « %s » ; elle contient « %s ».",
				strings.Join(exp, " "), strings.Join(got, " "))
		}
		kids := childrenOf(id)
		if len(kids) != len(want.Children) {
			return fail(append([]string{id}, kids...), "La page « %s » devrait avoir %d enfant(s) ; elle en a %d.",
				strings.Join(exp, " "), len(want.Children), len(kids))
		}
		for i, kid := range kids {
			if p := compare(kid, want.Children[i]); p != nil {
				return p
			}
		}
		return nil
	}
	return compare(roots[0], *c.Tree), nil
}

// EvaluateDiagram vérifie chaque règle et rend un rapport au même format que les tests Go.
func EvaluateDiagram(g Graph, checks []content.DiagramCheck, labels map[string]string) (TestReport, error) {
	v := newView(g)
	report := TestReport{Passed: true, Tests: []TestCase{}}
	for _, c := range checks {
		p, err := v.check(c, labels)
		if err != nil {
			return report, err
		}
		tc := TestCase{Name: c.Label, Status: "pass"}
		if p != nil {
			tc.Status, tc.Output, tc.Refs, report.Passed = "fail", p.msg, p.refs, false
		}
		report.Tests = append(report.Tests, tc)
	}
	return report, nil
}

func PaletteLabels(palette []content.PaletteItem) map[string]string {
	labels := map[string]string{}
	for _, p := range palette {
		labels[p.Type] = p.Label
	}
	return labels
}

func sortedKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	return keys
}

// VerifyDiagramSide évalue le diagram.json de solution/ ou starter/ d'un exercice (utilisé par verify_lab.sh).
func VerifyDiagramSide(labDir, side string, checks []content.DiagramCheck, labels map[string]string) (TestReport, error) {
	raw, err := os.ReadFile(filepath.Join(labDir, side, "diagram.json"))
	if err != nil {
		return TestReport{}, err
	}
	g, err := ParseGraph(string(raw))
	if err != nil {
		return TestReport{}, fmt.Errorf("%s : %w", side, err)
	}
	return EvaluateDiagram(g, checks, labels)
}
