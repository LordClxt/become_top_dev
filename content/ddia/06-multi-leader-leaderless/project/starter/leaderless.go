package lab

import (
	"errors"
)

// ---------- Jalon 1 : vecteurs de version et compteurs convergents ----------

// VV est un vecteur de version : un compteur par réplica.
type VV map[string]uint64

// Order est le résultat de la comparaison de deux vecteurs.
type Order int

const (
	Equal      Order = iota // mêmes compteurs
	Before                  // a s'est produit avant b (a est dépassé par b)
	After                   // b s'est produit avant a
	Concurrent              // aucun des deux ne connaît l'autre
)

// Compare dit si a s'est produit avant b, après b, s'ils sont égaux ou concurrents. Un compteur absent vaut 0.
func Compare(a, b VV) Order {
	// TODO
	return *new(Order)
}

// Inc renvoie une COPIE de v où le compteur du réplica est incrémenté.
func (v VV) Inc(replica string) VV {
	// TODO
	return *new(VV)
}

// Merge renvoie une nouvelle map : le maximum compteur par compteur. C'est aussi la fusion d'un compteur G-Counter.
func Merge(a, b VV) VV {
	// TODO
	return *new(VV)
}

// Sum est la valeur d'un G-Counter : la somme des compteurs de tous les réplicas.
func (v VV) Sum() uint64 {
	// TODO
	return *new(uint64)
}

// ---------- Jalon 2 : le serveur de versions (panier) ----------

type sibling struct {
	value   string
	version uint64
}

// Store est un serveur à un seul réplica qui détecte les écritures concurrentes avec un numéro de version par clé.
type Store struct {
	data map[string]*keyState
}

type keyState struct {
	version  uint64
	siblings []sibling
}

func NewStore() *Store {
	// TODO
	return &Store{data: map[string]*keyState{}}
}

// Get renvoie tous les contenus non écrasés (dans l'ordre d'écriture) et le dernier numéro de version de la clé.
func (s *Store) Get(key string) ([]string, uint64) {
	// TODO
	return *new([]string), *new(uint64)
}

// Put écrit value en précisant la version lue au préalable (0 si le client n'a rien lu).
// Le serveur attribue un nouveau numéro de version, écrase tous les contenus de version <= version reçue
// (ils ont été fusionnés par le client) et garde les autres : ils sont concurrents.
// Il renvoie la même chose que Get.
func (s *Store) Put(key, value string, version uint64) ([]string, uint64) {
	// TODO
	return *new([]string), *new(uint64)
}

// CartItem est un article de panier ; Removed marque une suppression (tombstone).
type CartItem struct {
	Name    string
	Removed bool
}

// MergeCarts fusionne des paniers concurrents : l'union des articles, triée par nom. Si un article est marqué supprimé
// dans au moins un panier, il reste supprimé (la suppression l'emporte), sinon il réapparaîtrait.
func MergeCarts(carts ...[]CartItem) []CartItem {
	// TODO
	return *new([]CartItem)
}

// ---------- Jalon 3 : un cluster à quorum ----------

var ErrQuorum = errors.New("quorum non atteint")

type entry struct {
	value   string
	version uint64
}

type node struct {
	down bool
	data map[string]entry
}

// Cluster réplique chaque clé sur N nœuds ; une écriture réussit avec W confirmations, une lecture avec R réponses.
type Cluster struct {
	N, W, R int
	nodes   []*node
}

func NewCluster(n, w, r int) *Cluster {
	c := &Cluster{N: n, W: w, R: r}
	for i := 0; i < n; i++ {
		c.nodes = append(c.nodes, &node{data: map[string]entry{}})
	}
	return c
}

// QuorumOverlaps dit si les ensembles de nœuds lus et écrits se recoupent toujours : w + r > n.
func QuorumOverlaps(n, w, r int) bool {
	// TODO
	return *new(bool)
}

// SetDown met un nœud en panne (ou le remet en marche). Ses données sont conservées.
func (c *Cluster) SetDown(i int, down bool) { c.nodes[i].down = down }

func (n *node) store(key string, e entry) {
	if cur, ok := n.data[key]; !ok || e.version > cur.version {
		n.data[key] = e
	}
}

// Write envoie l'écriture à tous les nœuds en marche ; un nœud ne garde une valeur que si sa version est plus récente.
// Renvoie ErrQuorum si moins de W nœuds ont confirmé, SANS annuler les copies déjà écrites.
func (c *Cluster) Write(key, value string, version uint64) error {
	// TODO
	return *new(error)
}

// Read interroge les nœuds de from (tous si from est vide), en ignorant ceux qui sont en panne. Il faut au moins R réponses,
// sinon ErrQuorum. Renvoie la valeur de plus haute version (clé absente : "", 0, nil) et répare les nœuds consultés en retard
// (read repair).
func (c *Cluster) Read(key string, from ...int) (string, uint64, error) {
	// TODO
	return *new(string), *new(uint64), *new(error)
}

// NodeVersion renvoie la version que le nœud i stocke pour la clé (0 si absente).
func (c *Cluster) NodeVersion(i int, key string) uint64 {
	// TODO
	return c.nodes[i].data[key].version
}

// AntiEntropy copie, pour chaque clé, la version la plus récente sur tous les nœuds en marche.
func (c *Cluster) AntiEntropy() {}
