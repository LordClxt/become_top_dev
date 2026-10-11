package lab

import (
	"slices"
	"sort"
)

// KV est une paire clé-valeur renvoyée par Scan.
type KV struct {
	Key   string
	Value string
}

type entry struct {
	key     string
	value   string
	deleted bool
}

// LSM est un LSM-tree en mémoire : une memtable, puis des SSTables immuables (triées par clé).
type LSM struct {
	limit     int
	mem       map[string]entry
	segments  [][]entry // segments[0] est le plus ancien
	consulted int
}

// New crée un LSM-tree dont la memtable est écrite en SSTable dès qu'elle contient limit clés distinctes
// (pierres tombales comprises). limit < 1 est ramené à 1.
func New(limit int) *LSM {
	return &LSM{limit: max(limit, 1), mem: map[string]entry{}}
}

// Put enregistre une valeur.
func (l *LSM) Put(key, value string) {
	l.mem[key] = entry{key: key, value: value}
	l.maybeFlush()
}

// Delete enregistre une pierre tombale (même si la clé n'existe pas : un segment plus ancien pourrait la contenir).
func (l *LSM) Delete(key string) {
	l.mem[key] = entry{key: key, deleted: true}
	l.maybeFlush()
}

func (l *LSM) maybeFlush() {
	if len(l.mem) < l.limit {
		return
	}
	seg := make([]entry, 0, len(l.mem))
	for _, e := range l.mem {
		seg = append(seg, e)
	}
	slices.SortFunc(seg, func(a, b entry) int {
		switch {
		case a.key < b.key:
			return -1
		case a.key > b.key:
			return 1
		}
		return 0
	})
	l.segments = append(l.segments, seg)
	l.mem = map[string]entry{}
}

// Get cherche d'abord dans la memtable, puis dans les segments du plus récent au plus ancien.
func (l *LSM) Get(key string) (string, bool) {
	l.consulted = 0
	if e, ok := l.mem[key]; ok {
		return e.value, !e.deleted
	}
	for i := len(l.segments) - 1; i >= 0; i-- {
		l.consulted++
		seg := l.segments[i]
		j := sort.Search(len(seg), func(j int) bool { return seg[j].key >= key })
		if j < len(seg) && seg[j].key == key {
			return seg[j].value, !seg[j].deleted
		}
	}
	return "", false
}

// SegmentsConsulted renvoie le nombre de SSTables examinées par le dernier appel à Get (la memtable n'est pas comptée).
func (l *LSM) SegmentsConsulted() int { return l.consulted }

// Segments renvoie le nombre de SSTables.
func (l *LSM) Segments() int { return len(l.segments) }

// merged renvoie la vue fusionnée (version la plus récente de chaque clé, pierres tombales comprises), triée.
func (l *LSM) merged() []entry {
	latest := map[string]entry{}
	for _, seg := range l.segments {
		for _, e := range seg {
			latest[e.key] = e
		}
	}
	for k, e := range l.mem {
		latest[k] = e
	}
	out := make([]entry, 0, len(latest))
	for _, e := range latest {
		out = append(out, e)
	}
	slices.SortFunc(out, func(a, b entry) int {
		switch {
		case a.key < b.key:
			return -1
		case a.key > b.key:
			return 1
		}
		return 0
	})
	return out
}

// Scan renvoie, triées par clé, les paires vivantes dont la clé k vérifie lo <= k < hi (hi == "" : sans borne haute).
func (l *LSM) Scan(lo, hi string) []KV {
	out := []KV{}
	for _, e := range l.merged() {
		if e.deleted || e.key < lo || (hi != "" && e.key >= hi) {
			continue
		}
		out = append(out, KV{Key: e.key, Value: e.value})
	}
	return out
}

// Compact fusionne toutes les SSTables en une seule en abandonnant les pierres tombales et les anciennes versions.
// La memtable n'est pas touchée. S'il ne reste aucune clé vivante, il ne reste aucun segment.
func (l *LSM) Compact() {
	if len(l.segments) == 0 {
		return
	}
	latest := map[string]entry{}
	for _, seg := range l.segments {
		for _, e := range seg {
			latest[e.key] = e
		}
	}
	var seg []entry
	for _, e := range latest {
		if !e.deleted {
			seg = append(seg, e)
		}
	}
	if len(seg) == 0 {
		l.segments = nil
		return
	}
	slices.SortFunc(seg, func(a, b entry) int {
		switch {
		case a.key < b.key:
			return -1
		case a.key > b.key:
			return 1
		}
		return 0
	})
	l.segments = [][]entry{seg}
}
