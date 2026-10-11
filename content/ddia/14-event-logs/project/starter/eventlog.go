package lab

import (
	"errors"
	"hash/fnv"
)

// Message est un enregistrement du log : sa position (partition, offset), sa clé et sa valeur.
// Une tombstone signale la suppression de la clé. (fourni)
type Message struct {
	Partition int
	Offset    int64
	Key       string
	Value     string
	Tombstone bool
}

// Erreurs à renvoyer. (fournies)
var (
	ErrBadPartitionCount = errors.New("il faut au moins une partition")
	ErrEmptyKey          = errors.New("clé vide")
	ErrNoPartition       = errors.New("partition inexistante")
	ErrOffsetOutOfRange  = errors.New("offset hors du log")
)

// Log est un log partitionné en ajout seul, avec les offsets validés des groupes de consommateurs. (fourni)
type Log struct {
	parts   [][]Message              // messages de chaque partition, par offset croissant
	next    []int64                  // prochain offset à attribuer dans chaque partition (= fin du log)
	commits map[string]map[int]int64 // groupe → partition → offset validé
}

// NewLog crée un log de n partitions. (fourni)
func NewLog(n int) (*Log, error) {
	if n < 1 {
		return nil, ErrBadPartitionCount
	}
	return &Log{parts: make([][]Message, n), next: make([]int64, n), commits: map[string]map[int]int64{}}, nil
}

// PartitionFor choisit la partition d'une clé (hachage FNV-1a) : une même clé tombe toujours au même endroit. (fourni)
func (l *Log) PartitionFor(key string) int {
	h := fnv.New32a()
	h.Write([]byte(key))
	return int(h.Sum32() % uint32(len(l.parts)))
}

// checkPartition renvoie ErrNoPartition si p n'existe pas. (fourni)
func (l *Log) checkPartition(p int) error {
	if p < 0 || p >= len(l.parts) {
		return ErrNoPartition
	}
	return nil
}

// ---------- Jalon 1 : le log partitionné ----------

// Append ajoute key=value à la fin de la partition de la clé (PartitionFor) et renvoie le message avec son
// offset : 0 pour le premier message d'une partition, puis +1 à chaque ajout dans CETTE partition.
// Clé vide : ErrEmptyKey.
func (l *Log) Append(key, value string) (Message, error) {
	// TODO
	return Message{}, errors.New("à implémenter")
}

// Delete ajoute une tombstone pour key (Tombstone: true, Value vide), avec les mêmes règles qu'Append.
func (l *Log) Delete(key string) (Message, error) {
	// TODO
	return Message{}, errors.New("à implémenter")
}

// EndOffset renvoie l'offset que recevra le prochain message de la partition. Partition inconnue : ErrNoPartition.
func (l *Log) EndOffset(p int) (int64, error) {
	// TODO
	return 0, errors.New("à implémenter")
}

// Read renvoie au plus max messages (tous si max <= 0) de la partition p dont l'offset est >= from, dans
// l'ordre. from doit être entre 0 et EndOffset(p) inclus, sinon ErrOffsetOutOfRange ; from == EndOffset(p)
// donne une slice vide non nil. La slice renvoyée est une copie : la modifier ne touche pas au log.
func (l *Log) Read(p int, from int64, max int) ([]Message, error) {
	// TODO: attention, après une compaction les offsets ne se suivent plus (il y a des trous)
	return nil, errors.New("à implémenter")
}

// ---------- Jalon 2 : les groupes de consommateurs ----------

// Commit enregistre la position du groupe dans la partition : tout ce qui précède est traité.
// offset entre 0 et EndOffset(p) inclus (sinon ErrOffsetOutOfRange) ; revenir en arrière est permis (rejeu).
func (l *Log) Commit(group string, p int, offset int64) error {
	// TODO
	return errors.New("à implémenter")
}

// Committed renvoie l'offset validé du groupe dans la partition (0 s'il n'a jamais validé).
func (l *Log) Committed(group string, p int) int64 {
	// TODO
	return -1
}

// Poll lit au plus max messages à partir de l'offset validé du groupe, SANS le faire avancer.
func (l *Log) Poll(group string, p int, max int) ([]Message, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// Lag renvoie le retard du groupe dans la partition : EndOffset − offset validé.
func (l *Log) Lag(group string, p int) (int64, error) {
	// TODO
	return 0, errors.New("à implémenter")
}

// Assign répartit les partitions entre les consommateurs d'un groupe : consommateurs triés par nom,
// partition i au consommateur i modulo leur nombre. Chaque consommateur a une slice non nil (vide s'il n'a
// rien). Sans consommateur : une map vide. consumers n'est pas modifié.
func Assign(partitions int, consumers []string) map[string][]int {
	// TODO
	return nil
}

// ---------- Jalon 3 : compaction et vue dérivée ----------

// Compact ne garde, pour chaque clé de la partition, que son dernier message, en conservant les offsets
// d'origine et leur ordre (la fin du log ne bouge pas). Si dropTombstones, les clés dont le dernier message
// est une tombstone disparaissent complètement.
func (l *Log) Compact(p int, dropTombstones bool) error {
	// TODO
	return errors.New("à implémenter")
}

// CatchUp applique à view, partition par partition, tous les messages postérieurs à l'offset validé du
// groupe (une valeur remplace, une tombstone supprime la clé), puis valide la fin du log. Renvoie le nombre
// de messages appliqués. Un groupe neuf reconstruit donc toute la vue depuis l'offset 0.
func (l *Log) CatchUp(group string, view map[string]string) (int, error) {
	// TODO
	return 0, errors.New("à implémenter")
}
