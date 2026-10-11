package lab

import (
	"errors"
	"hash/fnv"
	"sort"
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

// Append ajoute key=value à la fin de la partition de la clé et renvoie le message avec son offset.
func (l *Log) Append(key, value string) (Message, error) {
	return l.append(key, value, false)
}

// Delete ajoute une tombstone pour key.
func (l *Log) Delete(key string) (Message, error) {
	return l.append(key, "", true)
}

func (l *Log) append(key, value string, tombstone bool) (Message, error) {
	if key == "" {
		return Message{}, ErrEmptyKey
	}
	p := l.PartitionFor(key)
	m := Message{Partition: p, Offset: l.next[p], Key: key, Value: value, Tombstone: tombstone}
	l.parts[p] = append(l.parts[p], m)
	l.next[p]++
	return m, nil
}

// EndOffset renvoie l'offset que recevra le prochain message de la partition.
func (l *Log) EndOffset(p int) (int64, error) {
	if err := l.checkPartition(p); err != nil {
		return 0, err
	}
	return l.next[p], nil
}

// Read renvoie au plus max messages (tous si max <= 0) de la partition p dont l'offset est >= from.
func (l *Log) Read(p int, from int64, max int) ([]Message, error) {
	if err := l.checkPartition(p); err != nil {
		return nil, err
	}
	if from < 0 || from > l.next[p] {
		return nil, ErrOffsetOutOfRange
	}
	msgs := l.parts[p]
	i := sort.Search(len(msgs), func(i int) bool { return msgs[i].Offset >= from })
	end := len(msgs)
	if max > 0 && i+max < end {
		end = i + max
	}
	return append([]Message{}, msgs[i:end]...), nil
}

// ---------- Jalon 2 : les groupes de consommateurs ----------

// Commit enregistre la position du groupe dans la partition : tout ce qui précède est traité.
func (l *Log) Commit(group string, p int, offset int64) error {
	if err := l.checkPartition(p); err != nil {
		return err
	}
	if offset < 0 || offset > l.next[p] {
		return ErrOffsetOutOfRange
	}
	if l.commits[group] == nil {
		l.commits[group] = map[int]int64{}
	}
	l.commits[group][p] = offset
	return nil
}

// Committed renvoie l'offset validé du groupe (0 s'il n'a jamais validé).
func (l *Log) Committed(group string, p int) int64 {
	return l.commits[group][p]
}

// Poll lit à partir de l'offset validé du groupe, sans le faire avancer.
func (l *Log) Poll(group string, p int, max int) ([]Message, error) {
	return l.Read(p, l.Committed(group, p), max)
}

// Lag renvoie le retard du groupe dans la partition, en offsets.
func (l *Log) Lag(group string, p int) (int64, error) {
	end, err := l.EndOffset(p)
	if err != nil {
		return 0, err
	}
	return end - l.Committed(group, p), nil
}

// Assign répartit les partitions entre les consommateurs d'un groupe : consommateurs triés par nom,
// partition i au consommateur i modulo leur nombre. Chaque consommateur a une slice non nil.
func Assign(partitions int, consumers []string) map[string][]int {
	out := make(map[string][]int, len(consumers))
	if len(consumers) == 0 {
		return out
	}
	sorted := append([]string(nil), consumers...)
	sort.Strings(sorted)
	for _, c := range sorted {
		out[c] = []int{}
	}
	for p := 0; p < partitions; p++ {
		c := sorted[p%len(sorted)]
		out[c] = append(out[c], p)
	}
	return out
}

// ---------- Jalon 3 : compaction et vue dérivée ----------

// Compact ne garde, pour chaque clé de la partition, que son dernier message, en conservant les offsets
// d'origine et leur ordre. Si dropTombstones, les clés dont le dernier message est une tombstone disparaissent.
func (l *Log) Compact(p int, dropTombstones bool) error {
	if err := l.checkPartition(p); err != nil {
		return err
	}
	msgs := l.parts[p]
	last := make(map[string]int64, len(msgs))
	for _, m := range msgs {
		last[m.Key] = m.Offset
	}
	kept := make([]Message, 0, len(last))
	for _, m := range msgs {
		if last[m.Key] != m.Offset || (dropTombstones && m.Tombstone) {
			continue
		}
		kept = append(kept, m)
	}
	l.parts[p] = kept
	return nil
}

// CatchUp applique à view, partition par partition, tous les messages postérieurs à l'offset validé du
// groupe (une valeur remplace, une tombstone supprime), puis valide la fin du log. Renvoie le nombre de
// messages appliqués.
func (l *Log) CatchUp(group string, view map[string]string) (int, error) {
	applied := 0
	for p := range l.parts {
		msgs, err := l.Poll(group, p, 0)
		if err != nil {
			return applied, err
		}
		for _, m := range msgs {
			if m.Tombstone {
				delete(view, m.Key)
			} else {
				view[m.Key] = m.Value
			}
			applied++
		}
		if err := l.Commit(group, p, l.next[p]); err != nil {
			return applied, err
		}
	}
	return applied, nil
}
