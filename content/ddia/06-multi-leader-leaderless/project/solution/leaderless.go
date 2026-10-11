package lab

import (
	"errors"
	"fmt"
	"sort"
	"strings"
)

// VersionVector associe à chaque réplica le plus grand numéro de version vu pour lui. Absent = 0. (fourni)
type VersionVector map[string]uint64

// Ordering est le résultat de la comparaison de deux vecteurs. (fourni)
type Ordering int

const (
	Equal      Ordering = iota // mêmes compteurs partout
	Before                     // a s'est produit avant b (b connaît tout ce que connaît a, et plus)
	After                      // a s'est produit après b
	Concurrent                 // aucun des deux ne connaît tout l'autre
)

func (o Ordering) String() string {
	return [...]string{"Equal", "Before", "After", "Concurrent"}[o]
}

// Version est une valeur écrite par un client. (fourni)
// Node et Seq identifient l'écriture : le réplica coordinateur et son compteur au moment de l'écriture.
// Seen est le contexte envoyé par le client : le vecteur de ce qu'il avait lu avant d'écrire.
type Version struct {
	Value string
	Node  string
	Seq   uint64
	Seen  VersionVector
}

// Erreurs à renvoyer (enveloppées avec %w si tu ajoutes du contexte). (fournies)
var (
	ErrConfig   = errors.New("configuration invalide")
	ErrNoQuorum = errors.New("quorum non atteint")
	ErrUnknown  = errors.New("réplica inconnu")
)

// Replica est un nœud de stockage sans leader. (fourni)
type Replica struct {
	ID      string
	down    bool
	counter uint64
	data    map[string][]Version
}

// Cluster regroupe n réplicas, dans un ordre fixe, avec des quorums w et r. (fourni)
type Cluster struct {
	replicas []*Replica
	w, r     int
}

// Result est la réponse d'une lecture. (fourni)
// Context est la fusion des vecteurs (Clock) de tous les siblings renvoyés.
type Result struct {
	Values  []string      // les siblings, triés par ordre alphabétique ; vide si la clé n'existe pas
	Context VersionVector // à renvoyer dans le prochain Put pour écraser ces siblings
}

// Local renvoie les valeurs stockées sur un réplica, triées, sans passer par un quorum. Sert aux tests. (fourni)
func (c *Cluster) Local(id, key string) []string {
	for _, rep := range c.replicas {
		if rep.ID == id {
			return values(rep.data[key])
		}
	}
	return nil
}

func values(vs []Version) []string {
	out := make([]string, 0, len(vs))
	for _, v := range vs {
		out = append(out, v.Value)
	}
	sort.Strings(out)
	return out
}

// ---------- Jalon 1 : vecteurs de versions ----------

// Compare situe a par rapport à b.
func Compare(a, b VersionVector) Ordering {
	aBehind, bBehind := false, false
	for k, av := range a {
		switch bv := b[k]; {
		case av < bv:
			aBehind = true
		case av > bv:
			bBehind = true
		}
	}
	for k, bv := range b {
		if _, ok := a[k]; !ok && bv > 0 {
			aBehind = true
		}
	}
	switch {
	case aBehind && bBehind:
		return Concurrent
	case aBehind:
		return Before
	case bBehind:
		return After
	}
	return Equal
}

// Merge renvoie un nouveau vecteur : le maximum, entrée par entrée. Ni a ni b ne sont modifiés.
func Merge(a, b VersionVector) VersionVector {
	out := make(VersionVector, len(a)+len(b))
	for k, v := range a {
		out[k] = v
	}
	for k, v := range b {
		if v > out[k] {
			out[k] = v
		}
	}
	return out
}

// Clock est le vecteur complet de la version : son contexte plus sa propre écriture.
func (v Version) Clock() VersionVector {
	c := Merge(v.Seen, nil)
	if v.Seq > c[v.Node] {
		c[v.Node] = v.Seq
	}
	return c
}

// SupersededBy dit si o remplace v : l'écrivain de o avait vu l'écriture de v.
func (v Version) SupersededBy(o Version) bool {
	return o.Seen[v.Node] >= v.Seq
}

// Prune garde les siblings : sans doublon (même Node et Seq), sans version remplacée par une autre,
// triés par Node puis Seq. Jamais nil.
func Prune(vs []Version) []Version {
	out := []Version{}
	for i, v := range vs {
		keep := true
		for j, o := range vs {
			if v.SupersededBy(o) || (j < i && o.Node == v.Node && o.Seq == v.Seq) {
				keep = false
				break
			}
		}
		if keep {
			out = append(out, v)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Node != out[j].Node {
			return out[i].Node < out[j].Node
		}
		return out[i].Seq < out[j].Seq
	})
	return out
}

// ---------- Jalon 2 : quorums et read repair ----------

// NewCluster crée n réplicas (n = len(ids)) avec des quorums w et r.
func NewCluster(ids []string, w, r int) (*Cluster, error) {
	n := len(ids)
	if n == 0 || w < 1 || w > n || r < 1 || r > n {
		return nil, fmt.Errorf("%w : n=%d, w=%d, r=%d", ErrConfig, n, w, r)
	}
	c := &Cluster{w: w, r: r}
	seen := map[string]bool{}
	for _, id := range ids {
		if id == "" || seen[id] {
			return nil, fmt.Errorf("%w : identifiant %q vide ou en double", ErrConfig, id)
		}
		seen[id] = true
		c.replicas = append(c.replicas, &Replica{ID: id, data: map[string][]Version{}})
	}
	return c, nil
}

// SetDown rend un réplica injoignable (true) ou le rétablit (false).
func (c *Cluster) SetDown(id string, down bool) error {
	for _, rep := range c.replicas {
		if rep.ID == id {
			rep.down = down
			return nil
		}
	}
	return fmt.Errorf("%w : %q", ErrUnknown, id)
}

func (c *Cluster) up() []*Replica {
	var out []*Replica
	for _, rep := range c.replicas {
		if !rep.down {
			out = append(out, rep)
		}
	}
	return out
}

func (rep *Replica) apply(key string, vs []Version) {
	merged := append(append([]Version{}, rep.data[key]...), vs...)
	rep.data[key] = Prune(merged)
}

// Put écrit value. Le premier réplica disponible coordonne : il incrémente son compteur et fabrique la version.
// La version est envoyée à tous les réplicas disponibles ; moins de w accusés : ErrNoQuorum (sans retour arrière).
func (c *Cluster) Put(key, value string, ctx VersionVector) (VersionVector, error) {
	up := c.up()
	if len(up) == 0 {
		return nil, fmt.Errorf("%w : aucun réplica disponible", ErrNoQuorum)
	}
	coord := up[0]
	coord.counter++
	v := Version{Value: value, Node: coord.ID, Seq: coord.counter, Seen: Merge(ctx, nil)}
	for _, rep := range up {
		rep.apply(key, []Version{v})
	}
	if len(up) < c.w {
		return v.Clock(), fmt.Errorf("%w : %d accusés sur %d requis", ErrNoQuorum, len(up), c.w)
	}
	return v.Clock(), nil
}

// Get interroge les r premiers réplicas disponibles, fusionne leurs réponses et répare ceux qui étaient en retard.
func (c *Cluster) Get(key string) (Result, error) {
	up := c.up()
	if len(up) < c.r {
		return Result{}, fmt.Errorf("%w : %d réplicas disponibles sur %d requis", ErrNoQuorum, len(up), c.r)
	}
	asked := up[:c.r]
	var all []Version
	for _, rep := range asked {
		all = append(all, rep.data[key]...)
	}
	merged := Prune(all)
	for _, rep := range asked {
		rep.apply(key, merged)
	}
	return result(merged), nil
}

func result(vs []Version) Result {
	ctx := VersionVector{}
	for _, v := range vs {
		ctx = Merge(ctx, v.Clock())
	}
	return Result{Values: values(vs), Context: ctx}
}

// ---------- Jalon 3 : siblings, fusion, anti-entropie ----------

// UnionMerge fusionne des siblings de panier : chaque valeur est une liste d'articles séparés par des virgules.
// Résultat : l'union, sans doublon ni article vide, triée, jointe par des virgules.
func UnionMerge(siblings []string) string {
	set := map[string]bool{}
	for _, s := range siblings {
		for _, item := range strings.Split(s, ",") {
			if item = strings.TrimSpace(item); item != "" {
				set[item] = true
			}
		}
	}
	items := make([]string, 0, len(set))
	for item := range set {
		items = append(items, item)
	}
	sort.Strings(items)
	return strings.Join(items, ",")
}

// AntiEntropy aligne tous les réplicas disponibles, clé par clé, et renvoie le nombre de couples
// (réplica, clé) qui ont changé.
func (c *Cluster) AntiEntropy() int {
	up := c.up()
	keys := map[string]bool{}
	for _, rep := range up {
		for k := range rep.data {
			keys[k] = true
		}
	}
	changed := 0
	for k := range keys {
		var all []Version
		for _, rep := range up {
			all = append(all, rep.data[k]...)
		}
		merged := Prune(all)
		for _, rep := range up {
			if !sameVersions(rep.data[k], merged) { // les deux listes sont triées par Prune
				rep.data[k] = append([]Version{}, merged...)
				changed++
			}
		}
	}
	return changed
}

func sameVersions(a, b []Version) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].Node != b[i].Node || a[i].Seq != b[i].Seq {
			return false
		}
	}
	return true
}
