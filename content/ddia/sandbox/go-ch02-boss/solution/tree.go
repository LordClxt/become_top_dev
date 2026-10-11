package lab

import (
	"slices"
	"sort"
)

// Tree est un B+tree dont les pages vivent sur un Disk, protégé par un journal (WAL) : chaque Put est d'abord écrit
// en entier dans le WAL, puis appliqué aux pages ; au redémarrage, Open rejoue le journal.
type Tree struct {
	d       *Disk
	maxKeys int
}

// Open ouvre l'arbre. Elle commence par la reprise sur crash : chaque batch du WAL est (ré)appliqué aux pages, dans
// l'ordre, puis le journal est effacé. Si le disque n'a pas encore d'arbre, elle crée une racine feuille vide
// (journalisée comme n'importe quelle modification). maxKeys est ramené à 3 au minimum.
func Open(d *Disk, maxKeys int) (*Tree, error) {
	t := &Tree{d: d, maxKeys: max(maxKeys, 3)}
	if wal := d.WAL(); len(wal) > 0 {
		for _, b := range wal {
			if err := t.apply(b); err != nil {
				return nil, err
			}
		}
		if err := d.TruncateWAL(); err != nil {
			return nil, err
		}
	}
	if d.Root() == 0 {
		id := d.AllocPageID()
		if err := t.commit(Batch{Pages: map[PageID]Page{id: {Leaf: true}}, Root: id}); err != nil {
			return nil, err
		}
	}
	return t, nil
}

// apply écrit les pages d'un batch (par identifiant croissant) puis la racine.
func (t *Tree) apply(b Batch) error {
	ids := make([]PageID, 0, len(b.Pages))
	for id := range b.Pages {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	for _, id := range ids {
		if err := t.d.WritePage(id, b.Pages[id]); err != nil {
			return err
		}
	}
	if b.Root != 0 {
		return t.d.WriteRoot(b.Root)
	}
	return nil
}

// commit journalise le batch, l'applique, puis efface le journal.
func (t *Tree) commit(b Batch) error {
	if err := t.d.AppendWAL(b); err != nil {
		return err
	}
	if err := t.apply(b); err != nil {
		return err
	}
	return t.d.TruncateWAL()
}

// txn accumule les pages modifiées par une opération avant leur journalisation.
type txn struct {
	d     *Disk
	dirty map[PageID]Page
}

func (x *txn) read(id PageID) Page {
	if p, ok := x.dirty[id]; ok {
		return p.clone()
	}
	p, _ := x.d.ReadPage(id)
	return p
}

func childIndex(p Page, key string) int {
	return sort.Search(len(p.Keys), func(i int) bool { return p.Keys[i] > key })
}

// Put insère ou remplace une clé. Toutes les pages modifiées (feuille, pages éclatées, parents, éventuelle nouvelle
// racine) forment UN batch journalisé avant la moindre écriture de page. Renvoie l'erreur du disque (ErrCrash) si
// une écriture échoue : le journal contient alors le batch et Open le rejouera.
func (t *Tree) Put(key, value string) error {
	x := &txn{d: t.d, dirty: map[PageID]Page{}}
	root := t.d.Root()
	promoted, right, split := t.insert(x, root, key, value)
	b := Batch{Pages: x.dirty}
	if split {
		newRoot := t.d.AllocPageID()
		x.dirty[newRoot] = Page{Keys: []string{promoted}, Children: []PageID{root, right}}
		b.Root = newRoot
	}
	return t.commit(b)
}

func (t *Tree) insert(x *txn, id PageID, key, value string) (string, PageID, bool) {
	p := x.read(id)
	if p.Leaf {
		i := sort.SearchStrings(p.Keys, key)
		if i < len(p.Keys) && p.Keys[i] == key {
			p.Vals[i] = value
		} else {
			p.Keys = slices.Insert(p.Keys, i, key)
			p.Vals = slices.Insert(p.Vals, i, value)
		}
		if len(p.Keys) <= t.maxKeys {
			x.dirty[id] = p
			return "", 0, false
		}
		mid := len(p.Keys) / 2
		rightID := t.d.AllocPageID()
		right := Page{Leaf: true, Keys: slices.Clone(p.Keys[mid:]), Vals: slices.Clone(p.Vals[mid:])}
		p.Keys, p.Vals = slices.Clone(p.Keys[:mid]), slices.Clone(p.Vals[:mid])
		x.dirty[id], x.dirty[rightID] = p, right
		return right.Keys[0], rightID, true
	}

	i := childIndex(p, key)
	promoted, right, split := t.insert(x, p.Children[i], key, value)
	if !split {
		return "", 0, false
	}
	p.Keys = slices.Insert(p.Keys, i, promoted)
	p.Children = slices.Insert(p.Children, i+1, right)
	if len(p.Keys) <= t.maxKeys {
		x.dirty[id] = p
		return "", 0, false
	}
	mid := len(p.Keys) / 2
	up := p.Keys[mid]
	rightID := t.d.AllocPageID()
	sibling := Page{Keys: slices.Clone(p.Keys[mid+1:]), Children: slices.Clone(p.Children[mid+1:])}
	p.Keys, p.Children = slices.Clone(p.Keys[:mid]), slices.Clone(p.Children[:mid+1])
	x.dirty[id], x.dirty[rightID] = p, sibling
	return up, rightID, true
}

// Get cherche une clé en lisant les pages du disque, de la racine à une feuille.
func (t *Tree) Get(key string) (string, bool, error) {
	if t.d.Crashed() {
		return "", false, ErrCrash
	}
	id := t.d.Root()
	for {
		p, _ := t.d.ReadPage(id)
		if p.Leaf {
			i := sort.SearchStrings(p.Keys, key)
			if i < len(p.Keys) && p.Keys[i] == key {
				return p.Vals[i], true, nil
			}
			return "", false, nil
		}
		id = p.Children[childIndex(p, key)]
	}
}

// Range renvoie, triées, les clés k avec lo <= k < hi (hi == "" : sans borne haute).
func (t *Tree) Range(lo, hi string) ([]string, error) {
	if t.d.Crashed() {
		return nil, ErrCrash
	}
	var out []string
	var walk func(id PageID)
	walk = func(id PageID) {
		p, _ := t.d.ReadPage(id)
		if p.Leaf {
			for _, k := range p.Keys {
				if k >= lo && (hi == "" || k < hi) {
					out = append(out, k)
				}
			}
			return
		}
		for i, c := range p.Children {
			if i < len(p.Keys) && p.Keys[i] <= lo {
				continue
			}
			if i > 0 && hi != "" && p.Keys[i-1] >= hi {
				break
			}
			walk(c)
		}
	}
	walk(t.d.Root())
	return out, nil
}

// Height renvoie le nombre de niveaux (1 pour une racine feuille).
func (t *Tree) Height() (int, error) {
	if t.d.Crashed() {
		return 0, ErrCrash
	}
	h := 1
	p, _ := t.d.ReadPage(t.d.Root())
	for !p.Leaf {
		h++
		p, _ = t.d.ReadPage(p.Children[0])
	}
	return h, nil
}
