package lab

import (
	"errors"
	"slices"
)

// Direction indique dans quel sens suivre les arêtes.
type Direction int

const (
	// Outgoing suit les arêtes de la queue vers la tête.
	Outgoing Direction = iota
	// Incoming suit les arêtes de la tête vers la queue.
	Incoming
)

// ErrNoVertex est renvoyée quand une arête référence un sommet inexistant.
var ErrNoVertex = errors.New("sommet inconnu")

// Edge est une arête étiquetée.
type Edge struct {
	ID    int
	Tail  int
	Head  int
	Label string
}

// Graph est un graphe de propriétés en mémoire.
type Graph struct {
	props map[int]map[string]string
	edges []Edge
}

// NewGraph crée un graphe vide.
func NewGraph() *Graph {
	return &Graph{props: map[int]map[string]string{}}
}

// AddVertex ajoute (ou remplace les propriétés de) le sommet id.
func (g *Graph) AddVertex(id int, props map[string]string) {
	g.props[id] = props
}

// AddEdge ajoute une arête étiquetée et renvoie son identifiant (1, 2, 3… dans l'ordre d'ajout).
// Si le sommet de queue ou de tête n'existe pas, renvoie ErrNoVertex et n'ajoute rien.
func (g *Graph) AddEdge(tail, head int, label string) (int, error) {
	if _, ok := g.props[tail]; !ok {
		return 0, ErrNoVertex
	}
	if _, ok := g.props[head]; !ok {
		return 0, ErrNoVertex
	}
	id := len(g.edges) + 1
	g.edges = append(g.edges, Edge{ID: id, Tail: tail, Head: head, Label: label})
	return id, nil
}

// Neighbors renvoie les sommets voisins de v par des arêtes d'étiquette label, dans le sens dir,
// dans l'ordre des identifiants d'arêtes (doublons possibles si plusieurs arêtes).
func (g *Graph) Neighbors(v int, label string, dir Direction) []int {
	var out []int
	for _, e := range g.edges {
		if e.Label != label {
			continue
		}
		switch {
		case dir == Outgoing && e.Tail == v:
			out = append(out, e.Head)
		case dir == Incoming && e.Head == v:
			out = append(out, e.Tail)
		}
	}
	return out
}

// Reach renvoie, triés, tous les sommets atteignables depuis start en suivant zéro arête ou plus d'étiquette
// label dans le sens dir (l'équivalent de -[:LABEL*0..]->). start en fait partie s'il existe.
// Le graphe peut contenir des cycles. Un start inconnu donne nil.
func (g *Graph) Reach(start int, label string, dir Direction) []int {
	if _, ok := g.props[start]; !ok {
		return nil
	}
	seen := map[int]bool{start: true}
	queue := []int{start}
	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]
		for _, n := range g.Neighbors(v, label, dir) {
			if !seen[n] {
				seen[n] = true
				queue = append(queue, n)
			}
		}
	}
	out := make([]int, 0, len(seen))
	for v := range seen {
		out = append(out, v)
	}
	slices.Sort(out)
	return out
}

// FindByName renvoie les identifiants (triés) des sommets dont la propriété "name" vaut name.
func (g *Graph) FindByName(name string) []int {
	var out []int
	for id, p := range g.props {
		if p["name"] == name {
			out = append(out, id)
		}
	}
	slices.Sort(out)
	return out
}

// Migrated répond à : « qui est né dans un lieu situé dans `from` et vit dans un lieu situé dans `to` ? »
// C'est la requête Cypher
//
//	(person)-[:BORN_IN]->()-[:WITHIN*0..]->(from), (person)-[:LIVES_IN]->()-[:WITHIN*0..]->(to)
//
// Les lieux sont désignés par leur propriété "name". Les arêtes sont étiquetées "born_in", "lives_in" et "within".
// Renvoie les noms (propriété "name") des personnes, triés et sans doublon.
func (g *Graph) Migrated(from, to string) []string {
	bornIn := g.peopleIn(from, "born_in")
	livesIn := g.peopleIn(to, "lives_in")
	var names []string
	for id := range bornIn {
		if livesIn[id] {
			names = append(names, g.props[id]["name"])
		}
	}
	slices.Sort(names)
	return slices.Compact(names)
}

// peopleIn renvoie l'ensemble des sommets reliés par une arête label à un lieu situé (à 0 saut ou plus) dans placeName.
func (g *Graph) peopleIn(placeName, label string) map[int]bool {
	people := map[int]bool{}
	for _, root := range g.FindByName(placeName) {
		for _, place := range g.Reach(root, "within", Incoming) {
			for _, p := range g.Neighbors(place, label, Incoming) {
				people[p] = true
			}
		}
	}
	return people
}
