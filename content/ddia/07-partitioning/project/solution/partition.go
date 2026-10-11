package lab

import (
	"errors"
	"hash/fnv"
	"slices"
	"sort"
)

// Erreurs à renvoyer. (fournies)
var (
	ErrNoNodes          = errors.New("aucun nœud")
	ErrDuplicateNode    = errors.New("nœud déjà présent")
	ErrTooFewPartitions = errors.New("moins de partitions que de nœuds")
)

// HashKey renvoie le hachage FNV-1a 32 bits de la clé : stable entre processus et machines. (fourni)
func HashKey(key string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(key))
	return h.Sum32()
}

// ---------- Jalon 1 : nombre fixe de partitions ----------

// Router affecte un nombre fixe de partitions à des nœuds. L'affectation clé → partition ne change jamais ;
// seule l'affectation partition → nœud change lors d'un rééquilibrage.
type Router struct {
	owner []string // owner[p] = nœud qui possède la partition p
	nodes []string // nœuds, dans l'ordre d'arrivée
}

// NewRouter crée partitions partitions et les affecte en tourniquet : la partition p va à nodes[p % len(nodes)].
func NewRouter(partitions int, nodes []string) (*Router, error) {
	if len(nodes) == 0 {
		return nil, ErrNoNodes
	}
	if partitions < len(nodes) {
		return nil, ErrTooFewPartitions
	}
	seen := map[string]bool{}
	for _, n := range nodes {
		if seen[n] {
			return nil, ErrDuplicateNode
		}
		seen[n] = true
	}
	r := &Router{owner: make([]string, partitions), nodes: slices.Clone(nodes)}
	for p := range r.owner {
		r.owner[p] = nodes[p%len(nodes)]
	}
	return r, nil
}

// Partitions renvoie le nombre de partitions.
func (r *Router) Partitions() int { return len(r.owner) }

// Partition renvoie la partition d'une clé : HashKey(key) modulo le nombre de partitions.
func (r *Router) Partition(key string) int {
	return int(HashKey(key) % uint32(len(r.owner)))
}

// NodeFor renvoie le nœud qui possède la partition de la clé.
func (r *Router) NodeFor(key string) string {
	return r.owner[r.Partition(key)]
}

// Assignment renvoie, pour chaque nœud, ses partitions triées par numéro croissant.
func (r *Router) Assignment() map[string][]int {
	out := make(map[string][]int, len(r.nodes))
	for _, n := range r.nodes {
		out[n] = []int{}
	}
	for p, n := range r.owner {
		out[n] = append(out[n], p)
	}
	return out
}

// ---------- Jalon 2 : rééquilibrer en déplaçant des partitions entières ----------

// Move décrit le déplacement d'une partition entière d'un nœud à un autre.
type Move struct {
	Partition int
	From, To  string
}

// AddNode ajoute un nœud qui vole des partitions entières jusqu'à en avoir Partitions()/(nœuds) (division entière).
// À chaque vol, le donneur est le nœud qui a le plus de partitions (à égalité : le plus petit nom), et il cède
// sa partition de plus grand numéro. Renvoie les déplacements dans l'ordre.
func (r *Router) AddNode(node string) ([]Move, error) {
	if slices.Contains(r.nodes, node) {
		return nil, ErrDuplicateNode
	}
	if len(r.nodes)+1 > len(r.owner) {
		return nil, ErrTooFewPartitions
	}
	r.nodes = append(r.nodes, node)
	target := len(r.owner) / len(r.nodes)
	assign := r.Assignment()
	var moves []Move
	for len(assign[node]) < target {
		donor := ""
		for _, n := range r.nodes {
			if n == node {
				continue
			}
			if donor == "" || len(assign[n]) > len(assign[donor]) || (len(assign[n]) == len(assign[donor]) && n < donor) {
				donor = n
			}
		}
		parts := assign[donor]
		p := parts[len(parts)-1]
		assign[donor] = parts[:len(parts)-1]
		assign[node] = append(assign[node], p)
		r.owner[p] = node
		moves = append(moves, Move{Partition: p, From: donor, To: node})
	}
	return moves, nil
}

// ModNNode est la stratégie naïve : nodes[HashKey(key) % len(nodes)].
func ModNNode(key string, nodes []string) string {
	return nodes[HashKey(key)%uint32(len(nodes))]
}

// KeysMoved compte les clés dont le nœud diffère entre before et after.
func KeysMoved(keys []string, before, after func(string) string) int {
	moved := 0
	for _, k := range keys {
		if before(k) != after(k) {
			moved++
		}
	}
	return moved
}

// ---------- Jalon 3 : plages de clés et découpage dynamique ----------

type rangePart struct {
	start string   // borne basse incluse ("" pour la première partition)
	keys  []string // clés triées
}

// RangePartitioner partitionne par plage de clés et découpe une partition qui dépasse maxKeys clés.
type RangePartitioner struct {
	maxKeys int
	parts   []*rangePart
}

// NewRangePartitioner démarre avec une seule partition qui couvre toutes les clés.
func NewRangePartitioner(maxKeys int) *RangePartitioner {
	return &RangePartitioner{maxKeys: max(maxKeys, 1), parts: []*rangePart{{start: ""}}}
}

// Len renvoie le nombre de partitions.
func (rp *RangePartitioner) Len() int { return len(rp.parts) }

// Boundaries renvoie les bornes basses de toutes les partitions sauf la première, dans l'ordre.
func (rp *RangePartitioner) Boundaries() []string {
	out := []string{}
	for _, p := range rp.parts[1:] {
		out = append(out, p.start)
	}
	return out
}

// PartitionOf renvoie l'indice de la partition dont la plage contient key.
func (rp *RangePartitioner) PartitionOf(key string) int {
	// Première partition dont la borne basse est > key, moins un.
	return sort.Search(len(rp.parts), func(i int) bool { return rp.parts[i].start > key }) - 1
}

// Keys renvoie une copie des clés triées de la partition i.
func (rp *RangePartitioner) Keys(i int) []string {
	return slices.Clone(rp.parts[i].keys)
}

// Put insère key (sans doublon) et renvoie l'indice de la partition qui a reçu l'écriture. Si la partition
// dépasse maxKeys clés, elle est découpée au milieu : la gauche garde keys[:n/2], la droite commence à keys[n/2].
func (rp *RangePartitioner) Put(key string) int {
	i := rp.PartitionOf(key)
	p := rp.parts[i]
	pos, found := slices.BinarySearch(p.keys, key)
	if found {
		return i
	}
	p.keys = slices.Insert(p.keys, pos, key)
	if len(p.keys) > rp.maxKeys {
		mid := len(p.keys) / 2
		right := &rangePart{start: p.keys[mid], keys: slices.Clone(p.keys[mid:])}
		p.keys = slices.Clip(p.keys[:mid])
		rp.parts = slices.Insert(rp.parts, i+1, right)
	}
	return i
}

// Scan renvoie les clés de [from, to) dans l'ordre, et le nombre de partitions dont la plage recoupe [from, to).
func (rp *RangePartitioner) Scan(from, to string) ([]string, int) {
	out := []string{}
	if from >= to {
		return out, 0
	}
	first, last := rp.PartitionOf(from), rp.PartitionOf(to)
	if last > first && rp.parts[last].start == to {
		last-- // la partition qui commence exactement à to n'est pas concernée
	}
	for i := first; i <= last; i++ {
		for _, k := range rp.parts[i].keys {
			if k >= from && k < to {
				out = append(out, k)
			}
		}
	}
	return out, last - first + 1
}
