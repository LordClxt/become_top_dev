package lab

import (
	"errors"
	"maps"
	"slices"
)

// PageID identifie une page sur le disque simulé. 0 n'est jamais un identifiant valide.
type PageID int

// Page est une page de B+tree. Feuille : Leaf, Keys triées, Vals de même longueur. Page interne : Keys (n) et Children (n+1) ;
// l'enfant i couvre les clés k telles que Keys[i-1] <= k < Keys[i].
type Page struct {
	Leaf     bool
	Keys     []string
	Vals     []string
	Children []PageID
}

func (p Page) clone() Page {
	return Page{Leaf: p.Leaf, Keys: slices.Clone(p.Keys), Vals: slices.Clone(p.Vals), Children: slices.Clone(p.Children)}
}

// Batch est une modification atomique de l'arbre : les nouvelles versions des pages touchées et, si Root != 0,
// la nouvelle racine. C'est l'unité du journal (WAL).
type Batch struct {
	Pages map[PageID]Page
	Root  PageID
}

func (b Batch) clone() Batch {
	pages := make(map[PageID]Page, len(b.Pages))
	for id, p := range b.Pages {
		pages[id] = p.clone()
	}
	return Batch{Pages: pages, Root: b.Root}
}

// ErrCrash est renvoyée par toute opération du disque après un crash simulé.
var ErrCrash = errors.New("crash simulé")

// Disk simule un disque durable avec injection de pannes. Les écritures de pages et de racine sont comptées ;
// après CrashAfter(n), la n+1-ième échoue avec ErrCrash et le disque refuse tout jusqu'à Revive (le redémarrage).
// AppendWAL est atomique : un batch est soit entièrement journalisé, soit absent.
type Disk struct {
	pages   map[PageID]Page
	root    PageID
	wal     []Batch
	nextID  PageID
	writes  int
	budget  int // -1 : illimité
	crashed bool
}

// NewDisk crée un disque vide.
func NewDisk() *Disk { return &Disk{pages: map[PageID]Page{}, nextID: 1, budget: -1} }

// Clone copie l'état durable (pages, racine, journal, compteur d'identifiants) d'un disque sain.
func (d *Disk) Clone() *Disk {
	c := &Disk{pages: make(map[PageID]Page, len(d.pages)), root: d.root, nextID: d.nextID, budget: -1}
	for id, p := range d.pages {
		c.pages[id] = p.clone()
	}
	for _, b := range d.wal {
		c.wal = append(c.wal, b.clone())
	}
	return c
}

// CrashAfter programme un crash : n écritures de pages/racine réussiront, la suivante échouera.
func (d *Disk) CrashAfter(n int) { d.budget, d.writes = n, 0 }

// Revive simule le redémarrage de la machine : l'état durable est conservé, la panne est levée.
func (d *Disk) Revive() { d.crashed, d.budget = false, -1 }

// Crashed indique si le disque est en panne.
func (d *Disk) Crashed() bool { return d.crashed }

func (d *Disk) tick() error {
	if d.crashed {
		return ErrCrash
	}
	if d.budget >= 0 && d.writes >= d.budget {
		d.crashed = true
		return ErrCrash
	}
	d.writes++
	return nil
}

// WritePage écrase une page.
func (d *Disk) WritePage(id PageID, p Page) error {
	if err := d.tick(); err != nil {
		return err
	}
	d.pages[id] = p.clone()
	return nil
}

// WriteRoot change la racine.
func (d *Disk) WriteRoot(id PageID) error {
	if err := d.tick(); err != nil {
		return err
	}
	d.root = id
	return nil
}

// ReadPage renvoie une copie de la page.
func (d *Disk) ReadPage(id PageID) (Page, bool) {
	p, ok := d.pages[id]
	return p.clone(), ok
}

// Root renvoie la racine (0 si l'arbre n'existe pas encore).
func (d *Disk) Root() PageID { return d.root }

// AllocPageID réserve un identifiant de page (compteur durable, non compté comme une écriture).
func (d *Disk) AllocPageID() PageID {
	id := d.nextID
	d.nextID++
	return id
}

// AppendWAL journalise un batch de façon atomique et durable.
func (d *Disk) AppendWAL(b Batch) error {
	if d.crashed {
		return ErrCrash
	}
	d.wal = append(d.wal, b.clone())
	return nil
}

// WAL renvoie une copie des batchs journalisés et pas encore effacés, du plus ancien au plus récent.
func (d *Disk) WAL() []Batch {
	out := make([]Batch, len(d.wal))
	for i, b := range d.wal {
		out[i] = b.clone()
	}
	return out
}

// TruncateWAL efface le journal (une fois les pages écrites).
func (d *Disk) TruncateWAL() error {
	if d.crashed {
		return ErrCrash
	}
	d.wal = nil
	return nil
}

// PageIDs renvoie les identifiants des pages présentes sur le disque, triés.
func (d *Disk) PageIDs() []PageID {
	return slices.Sorted(maps.Keys(d.pages))
}
