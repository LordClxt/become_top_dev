package lab

import (
	"errors"
	"hash/fnv"
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
// seule l'affectation partition → nœud change lors d'un rééquilibrage. (champs fournis)
type Router struct {
	owner []string // owner[p] = nœud qui possède la partition p
	nodes []string // nœuds, dans l'ordre d'arrivée
}

// NewRouter crée partitions partitions et les affecte en tourniquet : la partition p va à nodes[p % len(nodes)].
// Aucun nœud : ErrNoNodes. Moins de partitions que de nœuds : ErrTooFewPartitions. Nœud en double : ErrDuplicateNode.
func NewRouter(partitions int, nodes []string) (*Router, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// Partitions renvoie le nombre de partitions.
func (r *Router) Partitions() int {
	// TODO
	return 0
}

// Partition renvoie la partition d'une clé : HashKey(key) modulo le nombre de partitions.
func (r *Router) Partition(key string) int {
	// TODO
	return 0
}

// NodeFor renvoie le nœud qui possède la partition de la clé.
func (r *Router) NodeFor(key string) string {
	// TODO
	return ""
}

// Assignment renvoie, pour chaque nœud (même sans partition), ses partitions triées par numéro croissant.
func (r *Router) Assignment() map[string][]int {
	// TODO
	return nil
}

// ---------- Jalon 2 : rééquilibrer en déplaçant des partitions entières ----------

// Move décrit le déplacement d'une partition entière d'un nœud à un autre. (fourni)
type Move struct {
	Partition int
	From, To  string
}

// AddNode ajoute un nœud qui vole des partitions entières jusqu'à en avoir Partitions()/(nœuds) (division entière).
// À chaque vol, le donneur est le nœud qui a le plus de partitions (à égalité : le plus petit nom), et il cède
// sa partition de plus grand numéro. Renvoie les déplacements dans l'ordre.
// Nœud déjà présent : ErrDuplicateNode. Plus de nœuds que de partitions : ErrTooFewPartitions.
func (r *Router) AddNode(node string) ([]Move, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// ModNNode est la stratégie naïve : nodes[HashKey(key) % len(nodes)].
func ModNNode(key string, nodes []string) string {
	// TODO
	return ""
}

// KeysMoved compte les clés dont le nœud diffère entre before et after.
func KeysMoved(keys []string, before, after func(string) string) int {
	// TODO
	return 0
}

// ---------- Jalon 3 : plages de clés et découpage dynamique ----------

// rangePart est une partition par plage. (fourni)
type rangePart struct {
	start string   // borne basse incluse ("" pour la première partition)
	keys  []string // clés triées
}

// RangePartitioner partitionne par plage de clés et découpe une partition qui dépasse maxKeys clés. (champs fournis)
type RangePartitioner struct {
	maxKeys int
	parts   []*rangePart
}

// NewRangePartitioner démarre avec une seule partition qui couvre toutes les clés.
func NewRangePartitioner(maxKeys int) *RangePartitioner {
	// TODO
	return &RangePartitioner{maxKeys: maxKeys}
}

// Len renvoie le nombre de partitions.
func (rp *RangePartitioner) Len() int {
	// TODO
	return 0
}

// Boundaries renvoie les bornes basses de toutes les partitions sauf la première, dans l'ordre.
func (rp *RangePartitioner) Boundaries() []string {
	// TODO
	return nil
}

// PartitionOf renvoie l'indice de la partition dont la plage contient key (borne basse incluse).
func (rp *RangePartitioner) PartitionOf(key string) int {
	// TODO
	return 0
}

// Keys renvoie une copie des clés triées de la partition i.
func (rp *RangePartitioner) Keys(i int) []string {
	// TODO
	return nil
}

// Put insère key (sans doublon) et renvoie l'indice de la partition qui a reçu l'écriture. Si la partition
// dépasse maxKeys clés, elle est découpée au milieu : la gauche garde keys[:n/2], la droite commence à keys[n/2].
func (rp *RangePartitioner) Put(key string) int {
	// TODO
	return 0
}

// Scan renvoie les clés de [from, to) dans l'ordre, et le nombre de partitions dont la plage recoupe [from, to).
// Intervalle vide (from >= to) : aucune clé, 0 partition.
func (rp *RangePartitioner) Scan(from, to string) ([]string, int) {
	// TODO
	return nil, 0
}
