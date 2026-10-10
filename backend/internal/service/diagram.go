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
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"btd/backend/internal/content"
)

const (
	maxNodes = 60
	maxEdges = 200
)

type Graph struct {
	Nodes []struct{ ID, Type string }
	Edges []struct{ Source, Target string }
}

// ParseGraph lit et contrôle un diagramme. Les erreurs sont destinées à l'utilisateur.
func ParseGraph(raw string) (Graph, error) {
	var wire struct {
		Nodes []struct {
			ID   *string `json:"id"`
			Type *string `json:"type"`
		} `json:"nodes"`
		Edges []struct {
			Source *string `json:"source"`
			Target *string `json:"target"`
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
		g.Nodes = append(g.Nodes, struct{ ID, Type string }{*n.ID, *n.Type})
	}
	for i, e := range wire.Edges {
		if e.Source == nil || e.Target == nil {
			return Graph{}, fmt.Errorf("diagramme illisible : la flèche n°%d n'a pas de source ou de cible", i+1)
		}
		g.Edges = append(g.Edges, struct{ Source, Target string }{*e.Source, *e.Target})
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
	typ   map[string]string
	succ  map[string]map[string]bool
	pred  map[string]map[string]bool
}

func newView(g Graph) *view {
	v := &view{typ: map[string]string{}, succ: map[string]map[string]bool{}, pred: map[string]map[string]bool{}}
	for _, n := range g.Nodes {
		v.order = append(v.order, n.ID)
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

// check renvoie "" si la règle est respectée, sinon ce qui manque, en français.
func (v *view) check(c content.DiagramCheck, labels map[string]string) (string, error) {
	name := func(t string) string {
		if l, ok := labels[t]; ok {
			return l
		}
		return t
	}
	switch c.Rule {
	case "path":
		froms, tos := v.of(c.Source), v.of(c.Target)
		if len(froms) == 0 {
			return fmt.Sprintf("Aucun bloc « %s » sur le diagramme.", name(c.Source)), nil
		}
		if len(tos) == 0 {
			return fmt.Sprintf("Aucun bloc « %s » sur le diagramme.", name(c.Target)), nil
		}
		reached := v.reachable(froms, "")
		if !slices.ContainsFunc(tos, func(t string) bool { return reached[t] }) {
			return fmt.Sprintf("Aucun chemin de « %s » vers « %s ».", name(c.Source), name(c.Target)), nil
		}
		if c.Via != "" {
			// Tous les chemins doivent traverser Via : on cherche une cible atteignable en l'évitant.
			if len(v.of(c.Via)) == 0 {
				return fmt.Sprintf("Aucun bloc « %s » sur le diagramme.", name(c.Via)), nil
			}
			bypass := v.reachable(froms, c.Via)
			for _, t := range tos {
				if bypass[t] && !slices.Contains(froms, t) {
					return fmt.Sprintf("Un chemin va de « %s » à « %s » sans passer par « %s ».",
						name(c.Source), name(c.Target), name(c.Via)), nil
				}
			}
		}
		return "", nil

	case "no_edge":
		for _, a := range v.of(c.Source) {
			for b := range v.succ[a] {
				if v.typ[b] == c.Target {
					return fmt.Sprintf("Une flèche relie directement « %s » à « %s ».", name(c.Source), name(c.Target)), nil
				}
			}
		}
		return "", nil

	case "inbound_via":
		targets := v.of(c.Target)
		if len(targets) == 0 {
			return fmt.Sprintf("Aucun bloc « %s » sur le diagramme.", name(c.Target)), nil
		}
		for _, t := range targets {
			if len(v.pred[t]) == 0 {
				return fmt.Sprintf("Rien n'arrive dans « %s ».", name(c.Target)), nil
			}
			for _, p := range sortedKeys(v.pred[t]) {
				if v.typ[p] != c.Via {
					return fmt.Sprintf("« %s » entre dans « %s » sans passer par « %s ».",
						name(v.typ[p]), name(c.Target), name(c.Via)), nil
				}
			}
		}
		return "", nil

	case "single_owner":
		for _, n := range v.of(c.Target) {
			if len(v.pred[n]) > 1 {
				var owners []string
				for p := range v.pred[n] {
					owners = append(owners, name(v.typ[p]))
				}
				slices.Sort(owners)
				return fmt.Sprintf("Une « %s » est partagée par : %s.", name(c.Target), strings.Join(owners, ", ")), nil
			}
		}
		return "", nil

	case "connected":
		for _, n := range v.order {
			if len(v.succ[n]) == 0 && len(v.pred[n]) == 0 {
				return fmt.Sprintf("« %s » n'est relié à rien.", name(v.typ[n])), nil
			}
		}
		return "", nil
	}
	return "", fmt.Errorf("règle inconnue : %s", c.Rule)
}

// EvaluateDiagram vérifie chaque règle et rend un rapport au même format que les tests Go.
func EvaluateDiagram(g Graph, checks []content.DiagramCheck, labels map[string]string) (TestReport, error) {
	v := newView(g)
	report := TestReport{Passed: true, Tests: []TestCase{}}
	for _, c := range checks {
		problem, err := v.check(c, labels)
		if err != nil {
			return report, err
		}
		tc := TestCase{Name: c.Label, Status: "pass"}
		if problem != "" {
			tc.Status, tc.Output, report.Passed = "fail", problem, false
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
