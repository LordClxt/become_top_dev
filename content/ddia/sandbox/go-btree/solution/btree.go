package lab

import "sort"

// Tree est un B+tree en mémoire : les clés et valeurs vivent dans les feuilles, les pages internes ne portent que
// des clés-frontières. Une page éclate quand elle dépasse maxKeys clés.
type Tree struct {
	root    *node
	maxKeys int
	height  int
	splits  int
	size    int
}

type node struct {
	keys     []string
	vals     []string // feuilles seulement
	children []*node  // pages internes seulement : len(children) == len(keys)+1
}

func (n *node) leaf() bool { return n.children == nil }

// New crée un arbre vide dont les pages contiennent au plus maxKeys clés (minimum 3).
func New(maxKeys int) *Tree {
	return &Tree{root: &node{}, maxKeys: max(maxKeys, 3), height: 1}
}

// Len renvoie le nombre de clés.
func (t *Tree) Len() int { return t.size }

// Height renvoie le nombre de niveaux : 1 pour une racine qui est une feuille.
func (t *Tree) Height() int { return t.height }

// Splits renvoie le nombre d'éclatements de pages effectués depuis la création (la création d'une nouvelle racine
// est un éclatement de l'ancienne).
func (t *Tree) Splits() int { return t.splits }

// childIndex renvoie l'indice de l'enfant à suivre pour key : les clés égales à une frontière vont à droite.
func childIndex(n *node, key string) int {
	return sort.Search(len(n.keys), func(i int) bool { return n.keys[i] > key })
}

// Get cherche une clé.
func (t *Tree) Get(key string) (string, bool) {
	n := t.root
	for !n.leaf() {
		n = n.children[childIndex(n, key)]
	}
	i := sort.SearchStrings(n.keys, key)
	if i < len(n.keys) && n.keys[i] == key {
		return n.vals[i], true
	}
	return "", false
}

// Put insère ou remplace une clé. Si une page déborde, elle éclate en deux pages à moitié pleines et la page parente
// reçoit la clé-frontière ; si la racine éclate, l'arbre gagne un niveau.
func (t *Tree) Put(key, value string) {
	promoted, right := t.insert(t.root, key, value)
	if right != nil {
		t.root = &node{keys: []string{promoted}, children: []*node{t.root, right}}
		t.height++
	}
}

// insert descend jusqu'à la feuille ; si le noeud éclate, renvoie la clé promue et la nouvelle page de droite.
func (t *Tree) insert(n *node, key, value string) (string, *node) {
	if n.leaf() {
		i := sort.SearchStrings(n.keys, key)
		if i < len(n.keys) && n.keys[i] == key {
			n.vals[i] = value
			return "", nil
		}
		n.keys = append(n.keys, "")
		copy(n.keys[i+1:], n.keys[i:])
		n.keys[i] = key
		n.vals = append(n.vals, "")
		copy(n.vals[i+1:], n.vals[i:])
		n.vals[i] = value
		t.size++
		if len(n.keys) <= t.maxKeys {
			return "", nil
		}
		t.splits++
		mid := len(n.keys) / 2
		right := &node{keys: append([]string(nil), n.keys[mid:]...), vals: append([]string(nil), n.vals[mid:]...)}
		n.keys, n.vals = n.keys[:mid:mid], n.vals[:mid:mid]
		return right.keys[0], right
	}

	i := childIndex(n, key)
	promoted, right := t.insert(n.children[i], key, value)
	if right == nil {
		return "", nil
	}
	n.keys = append(n.keys, "")
	copy(n.keys[i+1:], n.keys[i:])
	n.keys[i] = promoted
	n.children = append(n.children, nil)
	copy(n.children[i+2:], n.children[i+1:])
	n.children[i+1] = right
	if len(n.keys) <= t.maxKeys {
		return "", nil
	}
	t.splits++
	mid := len(n.keys) / 2
	up := n.keys[mid]
	sibling := &node{
		keys:     append([]string(nil), n.keys[mid+1:]...),
		children: append([]*node(nil), n.children[mid+1:]...),
	}
	n.keys, n.children = n.keys[:mid:mid], n.children[:mid+1:mid+1]
	return up, sibling
}

// Range renvoie, dans l'ordre, les clés k telles que lo <= k < hi. hi == "" signifie « sans borne supérieure ».
func (t *Tree) Range(lo, hi string) []string {
	var out []string
	var walk func(n *node)
	walk = func(n *node) {
		if n.leaf() {
			for _, k := range n.keys {
				if k >= lo && (hi == "" || k < hi) {
					out = append(out, k)
				}
			}
			return
		}
		for i, c := range n.children {
			// l'enfant i couvre [keys[i-1], keys[i])
			if i < len(n.keys) && n.keys[i] <= lo {
				continue
			}
			if i > 0 && hi != "" && n.keys[i-1] >= hi {
				break
			}
			walk(c)
		}
	}
	walk(t.root)
	return out
}
