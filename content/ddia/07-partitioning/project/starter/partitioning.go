package lab

import (
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
	// TODO
	return *new(int)
}

// RangePartitioner partitionne par plages de clés. bounds[i] est la plus petite clé de la partition i+1 : il y a
// donc len(bounds)+1 partitions. bounds est trié.
type RangePartitioner struct {
	bounds []string
}

func NewRangePartitioner(bounds []string) *RangePartitioner {
	return &RangePartitioner{bounds: append([]string(nil), bounds...)}
}

func (r *RangePartitioner) Partitions() int {
	// TODO
	return len(r.bounds) + 1
}

// Locate renvoie la partition d'une clé : le nombre de bornes inférieures ou égales à la clé.
func (r *RangePartitioner) Locate(key string) int {
	// TODO
	return *new(int)
}

// RangeQuery renvoie, dans l'ordre croissant, les partitions à interroger pour lire toutes les clés de from à to inclus.
func (r *RangePartitioner) RangeQuery(from, to string) []int {
	// TODO
	return *new([]int)
}

// SaltedKey ajoute un sel à une clé très chaude pour répartir ses écritures : "celebrity#07".
func SaltedKey(key string, shard int) string {
	// TODO
	return *new(string)
}

// AllSalted renvoie les n clés salées d'une clé chaude (celles qu'une lecture doit fusionner).
func AllSalted(key string, n int) []string {
	// TODO
	return *new([]string)
}

// ---------- Jalon 2 : rééquilibrer ----------

// ModNPartition est la mauvaise méthode : hash mod N, où N est le nombre de nœuds.
func ModNPartition(key string, nodes int) int {
	// TODO
	return *new(int)
}

// MovedFraction renvoie la part des clés dont l'emplacement diffère entre before et after (0 si keys est vide).
func MovedFraction(keys []string, before, after func(string) int) float64 {
	// TODO
	return *new(float64)
}

// Assignment associe chaque partition à son nœud.
type Assignment map[int]string

// Assign répartit `parts` partitions sur les nœuds : la partition i va au nœud i mod len(nodes).
func Assign(parts int, nodes []string) Assignment {
	// TODO
	return *new(Assignment)
}

// Load renvoie le nombre de partitions de chaque nœud.
func (a Assignment) Load() map[string]int {
	// TODO
	return *new(map[string]int)
}

// Balanced dit si l'écart entre le nœud le plus chargé et le moins chargé est d'une partition au plus.
func (a Assignment) Balanced() bool {
	// TODO
	return *new(bool)
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
	// TODO
	return *new(Assignment), *new(int)
}

// RemoveNode retire un nœud : chacune de ses partitions va, une par une, au nœud le moins chargé (à égalité, le plus petit nom).
// Renvoie la nouvelle affectation et le nombre de partitions déplacées.
func RemoveNode(a Assignment, node string) (Assignment, int) {
	// TODO
	return *new(Assignment), *new(int)
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

func term(field, value string) string {
	// TODO
	return field + ":" + value
}

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
	// TODO
	return *new(int)
}

// Query interroge TOUTES les partitions (scatter/gather) et fusionne les résultats triés.
func (s *LocalIndexStore) Query(field, value string) ([]string, int) {
	// TODO
	return *new([]string), *new(int)
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
	// TODO
	return *new(int)
}

// Query ne lit qu'UNE partition d'index : celle du terme.
func (s *GlobalIndexStore) Query(field, value string) ([]string, int) {
	// TODO
	return *new([]string), *new(int)
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

func NewRouter(parts int) *Router {
	// TODO
	return &Router{parts: parts}
}

// Update n'accepte que la première table ou une table de version STRICTEMENT supérieure ; renvoie true si elle est appliquée.
func (r *Router) Update(t RoutingTable) bool {
	// TODO
	return *new(bool)
}

// NodeFor renvoie le nœud qui possède la partition de la clé ; false si aucune table n'a encore été reçue.
func (r *Router) NodeFor(key string) (string, bool) {
	// TODO
	return *new(string), *new(bool)
}
