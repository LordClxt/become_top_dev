package lab

// Tree est un B+tree en mémoire : les clés et valeurs vivent dans les feuilles, les pages internes ne portent que
// des clés-frontières. Une page éclate quand elle dépasse maxKeys clés.
type Tree struct {
	root    *node
	maxKeys int
	height  int
	splits  int
	size    int
}

// node est une page : feuille (children == nil) ou page interne (len(children) == len(keys)+1).
type node struct {
	keys     []string
	vals     []string // feuilles seulement
	children []*node  // pages internes seulement : len(children) == len(keys)+1
}

func (n *node) leaf() bool { return n.children == nil }

// New crée un arbre vide dont les pages contiennent au plus maxKeys clés (minimum 3).
func New(maxKeys int) *Tree {
	// TODO
	panic("à implémenter")
}

// Len renvoie le nombre de clés.
func (t *Tree) Len() int {
	// TODO
	panic("à implémenter")
}

// Height renvoie le nombre de niveaux : 1 pour une racine qui est une feuille.
func (t *Tree) Height() int {
	// TODO
	panic("à implémenter")
}

// Splits renvoie le nombre d'éclatements de pages effectués depuis la création (l'éclatement de la racine compte).
func (t *Tree) Splits() int {
	// TODO
	panic("à implémenter")
}

// Get cherche une clé. Dans une page interne, les clés égales à une frontière vont à droite.
func (t *Tree) Get(key string) (string, bool) {
	// TODO
	panic("à implémenter")
}

// Put insère ou remplace une clé. Si une page déborde (plus de maxKeys clés), elle éclate en deux pages à moitié
// pleines et la page parente reçoit la clé-frontière ; si la racine éclate, l'arbre gagne un niveau.
func (t *Tree) Put(key, value string) {
	// TODO
	panic("à implémenter")
}

// Range renvoie, dans l'ordre, les clés k telles que lo <= k < hi. hi == "" signifie « sans borne supérieure ».
func (t *Tree) Range(lo, hi string) []string {
	// TODO
	panic("à implémenter")
}
