package lab

import "errors"

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
	// TODO
	panic("à implémenter")
}

// AddVertex ajoute (ou remplace les propriétés de) le sommet id.
func (g *Graph) AddVertex(id int, props map[string]string) {
	// TODO
	panic("à implémenter")
}

// AddEdge ajoute une arête étiquetée et renvoie son identifiant (1, 2, 3… dans l'ordre d'ajout).
// Si le sommet de queue ou de tête n'existe pas, renvoie ErrNoVertex et n'ajoute rien.
func (g *Graph) AddEdge(tail, head int, label string) (int, error) {
	// TODO
	panic("à implémenter")
}

// Neighbors renvoie les sommets voisins de v par des arêtes d'étiquette label, dans le sens dir,
// dans l'ordre des identifiants d'arêtes (doublons possibles si plusieurs arêtes).
func (g *Graph) Neighbors(v int, label string, dir Direction) []int {
	// TODO
	panic("à implémenter")
}

// Reach renvoie, triés, tous les sommets atteignables depuis start en suivant zéro arête ou plus d'étiquette
// label dans le sens dir (l'équivalent de -[:LABEL*0..]->). start en fait partie s'il existe.
// Le graphe peut contenir des cycles. Un start inconnu donne nil.
func (g *Graph) Reach(start int, label string, dir Direction) []int {
	// TODO
	panic("à implémenter")
}

// FindByName renvoie les identifiants (triés) des sommets dont la propriété "name" vaut name.
func (g *Graph) FindByName(name string) []int {
	// TODO
	panic("à implémenter")
}

// Migrated répond à : « qui est né dans un lieu situé dans `from` et vit dans un lieu situé dans `to` ? »
// C'est la requête Cypher
//
//	(person)-[:BORN_IN]->()-[:WITHIN*0..]->(from), (person)-[:LIVES_IN]->()-[:WITHIN*0..]->(to)
//
// Les lieux sont désignés par leur propriété "name". Les arêtes sont étiquetées "born_in", "lives_in" et "within".
// Renvoie les noms (propriété "name") des personnes, triés et sans doublon.
func (g *Graph) Migrated(from, to string) []string {
	// TODO
	panic("à implémenter")
}
