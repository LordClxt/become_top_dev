package lab

import (
	"fmt"
	"hash/fnv"
	"sort"
)

// ---------- Jalon 1 : où vit une clé ? ----------

// Hash est la fonction de hachage de Tinybase : FNV-1a 32 bits suivi d'un mélange final (les bits de poids fort de FNV seul
// sont trop corrélés pour des clés qui se ressemblent). Elle donne le même résultat dans tous les processus
// (contrairement au hashCode de certains langages). (fournie)
func Hash(key string) uint32 {
	f := fnv.New32a()
	f.Write([]byte(key))
	h := f.Sum32()
	h ^= h >> 16
	h *= 0x85ebca6b
	h ^= h >> 13
	h *= 0xc2b2ae35
	h ^= h >> 16
	return h
}

// HashPartition range l'espace des hachages [0, 2^32) en `parts` tranches contiguës de même taille et renvoie la tranche
// de la clé. Le nombre de partitions est fixe : seule l'affectation partition → nœud changera.
func HashPartition(key string, parts int) int {
	return int(uint64(Hash(key)) * uint64(parts) >> 32)
}

// RangePartitioner partitionne par plages de clés. bounds[i] est la plus petite clé de la partition i+1 : il y a
// donc len(bounds)+1 partitions. bounds est trié.
type RangePartitioner struct {
	bounds []string
}

func NewRangePartitioner(bounds []string) *RangePartitioner {
	return &RangePartitioner{bounds: append([]string(nil), bounds...)}
}

func (r *RangePartitioner) Partitions() int { return len(r.bounds) + 1 }

// Locate renvoie la partition d'une clé : le nombre de bornes inférieures ou égales à la clé.
func (r *RangePartitioner) Locate(key string) int {
	return sort.Search(len(r.bounds), func(i int) bool { return r.bounds[i] > key })
}

// RangeQuery renvoie, dans l'ordre croissant, les partitions à interroger pour lire toutes les clés de from à to inclus.
func (r *RangePartitioner) RangeQuery(from, to string) []int {
	var out []int
	for p := r.Locate(from); p <= r.Locate(to); p++ {
		out = append(out, p)
	}
	return out
}

// SaltedKey ajoute un sel à une clé très chaude pour répartir ses écritures : "celebrity#07".
func SaltedKey(key string, shard int) string { return fmt.Sprintf("%s#%02d", key, shard) }

// AllSalted renvoie les n clés salées d'une clé chaude (celles qu'une lecture doit fusionner).
func AllSalted(key string, n int) []string {
	out := make([]string, n)
	for i := range out {
		out[i] = SaltedKey(key, i)
	}
	return out
}

// ---------- Jalon 2 : rééquilibrer ----------

// ModNPartition est la mauvaise méthode : hash mod N, où N est le nombre de nœuds.
func ModNPartition(key string, nodes int) int { return int(Hash(key) % uint32(nodes)) }

// MovedFraction renvoie la part des clés dont l'emplacement diffère entre before et after (0 si keys est vide).
func MovedFraction(keys []string, before, after func(string) int) float64 {
	if len(keys) == 0 {
		return 0
	}
	moved := 0
	for _, k := range keys {
		if before(k) != after(k) {
			moved++
		}
	}
	return float64(moved) / float64(len(keys))
}

// Assignment associe chaque partition à son nœud.
type Assignment map[int]string

// Assign répartit `parts` partitions sur les nœuds : la partition i va au nœud i mod len(nodes).
func Assign(parts int, nodes []string) Assignment {
	a := Assignment{}
	for p := 0; p < parts; p++ {
		a[p] = nodes[p%len(nodes)]
	}
	return a
}

// Load renvoie le nombre de partitions de chaque nœud.
func (a Assignment) Load() map[string]int {
	out := map[string]int{}
	for _, n := range a {
		out[n]++
	}
	return out
}

// Balanced dit si l'écart entre le nœud le plus chargé et le moins chargé est d'une partition au plus.
func (a Assignment) Balanced() bool {
	lo, hi := -1, 0
	for _, c := range a.Load() {
		if lo == -1 || c < lo {
			lo = c
		}
		if c > hi {
			hi = c
		}
	}
	return hi-lo <= 1
}

func (a Assignment) clone() Assignment {
	b := make(Assignment, len(a))
	for p, n := range a {
		b[p] = n
	}
	return b
}

// pickMost renvoie le nœud le plus chargé (à égalité, le plus petit nom), pickLeast le moins chargé (idem).
func pickMost(load map[string]int, skip string) string {
	best, bestLoad := "", -1
	for n, c := range load {
		if n == skip {
			continue
		}
		if c > bestLoad || (c == bestLoad && n < best) {
			best, bestLoad = n, c
		}
	}
	return best
}

func pickLeast(load map[string]int) string {
	best, bestLoad := "", -1
	for n, c := range load {
		if bestLoad == -1 || c < bestLoad || (c == bestLoad && n < best) {
			best, bestLoad = n, c
		}
	}
	return best
}

// AddNode ajoute un nœud : il vole des partitions ENTIÈRES aux nœuds les plus chargés (à chaque fois, la partition de plus
// grand numéro du nœud le plus chargé) jusqu'à posséder len(a)/(nœuds+1) partitions (arrondi inférieur).
// Renvoie la nouvelle affectation (a n'est pas modifiée) et le nombre de partitions déplacées.
func AddNode(a Assignment, node string) (Assignment, int) {
	b := a.clone()
	load := b.Load()
	target := len(b) / (len(load) + 1)
	moved := 0
	for moved < target {
		from := pickMost(load, node)
		victim := -1
		for p, n := range b {
			if n == from && p > victim {
				victim = p
			}
		}
		b[victim] = node
		load[from]--
		load[node]++
		moved++
	}
	return b, moved
}

// RemoveNode retire un nœud : chacune de ses partitions va, une par une, au nœud le moins chargé (à égalité, le plus petit nom).
// Renvoie la nouvelle affectation et le nombre de partitions déplacées.
func RemoveNode(a Assignment, node string) (Assignment, int) {
	b := a.clone()
	load := b.Load()
	delete(load, node)
	var mine []int
	for p, n := range b {
		if n == node {
			mine = append(mine, p)
		}
	}
	sort.Ints(mine)
	for _, p := range mine {
		to := pickLeast(load)
		b[p] = to
		load[to]++
	}
	return b, len(mine)
}

// ---------- Jalon 3 : index secondaires et routage ----------

// Doc est un document indexé par ses champs (par exemple color=red, make=Ford).
type Doc struct {
	ID     string
	Fields map[string]string
}

// IndexedStore range des documents dans `parts` partitions (par hachage de l'ID) et sait chercher par champ.
// Put renvoie le nombre de partitions touchées par l'écriture ; Query renvoie les ID triés et le nombre de partitions interrogées.
type IndexedStore interface {
	Put(d Doc) int
	Query(field, value string) ([]string, int)
}

func term(field, value string) string { return field + ":" + value }

// LocalIndexStore : chaque partition possède son propre index, qui ne couvre que ses documents (index par document).
type LocalIndexStore struct {
	parts int
	index []map[string]map[string]bool // partition → terme → ensemble d'ID
}

func NewLocalIndexStore(parts int) *LocalIndexStore {
	s := &LocalIndexStore{parts: parts, index: make([]map[string]map[string]bool, parts)}
	for i := range s.index {
		s.index[i] = map[string]map[string]bool{}
	}
	return s
}

func addTo(idx map[string]map[string]bool, t, id string) {
	if idx[t] == nil {
		idx[t] = map[string]bool{}
	}
	idx[t][id] = true
}

func sortedIDs(set map[string]bool) []string {
	out := make([]string, 0, len(set))
	for id := range set {
		out = append(out, id)
	}
	sort.Strings(out)
	return out
}

// Put écrit le document et met à jour l'index de SA partition : 1 partition touchée.
func (s *LocalIndexStore) Put(d Doc) int {
	p := HashPartition(d.ID, s.parts)
	for f, v := range d.Fields {
		addTo(s.index[p], term(f, v), d.ID)
	}
	return 1
}

// Query interroge TOUTES les partitions (scatter/gather) et fusionne les résultats triés.
func (s *LocalIndexStore) Query(field, value string) ([]string, int) {
	all := map[string]bool{}
	for p := 0; p < s.parts; p++ {
		for id := range s.index[p][term(field, value)] {
			all[id] = true
		}
	}
	return sortedIDs(all), s.parts
}

// GlobalIndexStore : l'index est partitionné lui aussi, par hachage du terme « champ:valeur » (index par terme).
type GlobalIndexStore struct {
	parts int
	index []map[string]map[string]bool // partition d'index → terme → ensemble d'ID
}

func NewGlobalIndexStore(parts int) *GlobalIndexStore {
	s := &GlobalIndexStore{parts: parts, index: make([]map[string]map[string]bool, parts)}
	for i := range s.index {
		s.index[i] = map[string]map[string]bool{}
	}
	return s
}

// Put écrit le document (1 partition) et met à jour chaque terme dans sa partition d'index : renvoie 1 plus le nombre de
// partitions d'index DISTINCTES touchées.
func (s *GlobalIndexStore) Put(d Doc) int {
	touched := map[int]bool{}
	for f, v := range d.Fields {
		t := term(f, v)
		p := HashPartition(t, s.parts)
		addTo(s.index[p], t, d.ID)
		touched[p] = true
	}
	return 1 + len(touched)
}

// Query ne lit qu'UNE partition d'index : celle du terme.
func (s *GlobalIndexStore) Query(field, value string) ([]string, int) {
	t := term(field, value)
	return sortedIDs(s.index[HashPartition(t, s.parts)][t]), 1
}

// RoutingTable dit quel nœud possède chaque partition ; Version augmente à chaque rééquilibrage.
type RoutingTable struct {
	Version int
	Owner   map[int]string
}

// Router route les clés vers les nœuds avec la table de routage la plus récente qu'il ait reçue.
type Router struct {
	parts int
	table RoutingTable
	has   bool
}

func NewRouter(parts int) *Router { return &Router{parts: parts} }

// Update n'accepte que la première table ou une table de version STRICTEMENT supérieure ; renvoie true si elle est appliquée.
func (r *Router) Update(t RoutingTable) bool {
	if r.has && t.Version <= r.table.Version {
		return false
	}
	r.table, r.has = t, true
	return true
}

// NodeFor renvoie le nœud qui possède la partition de la clé ; false si aucune table n'a encore été reçue.
func (r *Router) NodeFor(key string) (string, bool) {
	if !r.has {
		return "", false
	}
	n, ok := r.table.Owner[HashPartition(key, r.parts)]
	return n, ok
}
