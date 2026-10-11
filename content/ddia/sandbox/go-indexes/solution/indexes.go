package lab

import (
	"slices"
	"sort"
	"strings"
)

// Row est une ligne d'une table d'annuaire.
type Row struct {
	ID    int
	Last  string
	First string
	City  string
}

// Secondary est un index secondaire : valeur d'une colonne → liste triée des identifiants de lignes.
type Secondary struct {
	col func(Row) string
	ids map[string][]int
}

// NewSecondary crée un index secondaire sur la colonne extraite par col.
func NewSecondary(col func(Row) string) *Secondary {
	return &Secondary{col: col, ids: map[string][]int{}}
}

// Add indexe une ligne (sans doublon si la même ligne est ajoutée deux fois).
func (s *Secondary) Add(r Row) {
	v := s.col(r)
	list := s.ids[v]
	i, found := slices.BinarySearch(list, r.ID)
	if !found {
		s.ids[v] = slices.Insert(list, i, r.ID)
	}
}

// Remove retire une ligne de l'index (sans effet si elle n'y est pas). Une valeur sans ligne disparaît de l'index.
func (s *Secondary) Remove(r Row) {
	v := s.col(r)
	list := s.ids[v]
	if i, found := slices.BinarySearch(list, r.ID); found {
		list = slices.Delete(list, i, i+1)
		if len(list) == 0 {
			delete(s.ids, v)
		} else {
			s.ids[v] = list
		}
	}
}

// Lookup renvoie une copie des identifiants triés des lignes ayant cette valeur.
func (s *Secondary) Lookup(value string) []int {
	return slices.Clone(s.ids[value])
}

// Concat est un index concaténé : les lignes sont triées par la concaténation des colonnes, dans l'ordre déclaré.
type Concat struct {
	cols    []func(Row) string
	entries []concatEntry // trié par (key, id)
}

type concatEntry struct {
	key string
	id  int
}

const sep = "\x00"

// NewConcat crée un index concaténé sur les colonnes, dans cet ordre.
func NewConcat(cols ...func(Row) string) *Concat {
	return &Concat{cols: cols}
}

func (c *Concat) key(values ...string) string {
	var b strings.Builder
	for _, v := range values {
		b.WriteString(v)
		b.WriteString(sep)
	}
	return b.String()
}

// Add indexe une ligne.
func (c *Concat) Add(r Row) {
	values := make([]string, len(c.cols))
	for i, col := range c.cols {
		values[i] = col(r)
	}
	e := concatEntry{key: c.key(values...), id: r.ID}
	i := sort.Search(len(c.entries), func(i int) bool {
		x := c.entries[i]
		return x.key > e.key || (x.key == e.key && x.id >= e.id)
	})
	c.entries = slices.Insert(c.entries, i, e)
}

// Lookup renvoie les identifiants des lignes dont les premières colonnes valent prefix, dans l'ordre de l'index
// (par clé concaténée, puis par identifiant). Un préfixe vide renvoie tout l'index ; un préfixe plus long que
// le nombre de colonnes renvoie nil.
func (c *Concat) Lookup(prefix ...string) []int {
	if len(prefix) > len(c.cols) {
		return nil
	}
	p := c.key(prefix...)
	start := sort.Search(len(c.entries), func(i int) bool { return c.entries[i].key >= p })
	var ids []int
	for i := start; i < len(c.entries) && strings.HasPrefix(c.entries[i].key, p); i++ {
		ids = append(ids, c.entries[i].id)
	}
	return ids
}

// UsablePrefix renvoie le nombre de colonnes de tête de l'index (dans leur ordre) que la requête contraint par égalité :
// on s'arrête à la première colonne non contrainte.
func UsablePrefix(index []string, constrained map[string]bool) int {
	n := 0
	for _, col := range index {
		if !constrained[col] {
			break
		}
		n++
	}
	return n
}

// Covers indique si un index (colonnes de clé indexCols plus colonnes incluses included) peut répondre seul à une
// requête qui sélectionne `selected` et filtre sur `filtered` : toutes ces colonnes doivent s'y trouver.
func Covers(indexCols, included, selected, filtered []string) bool {
	has := func(col string) bool { return slices.Contains(indexCols, col) || slices.Contains(included, col) }
	for _, c := range slices.Concat(selected, filtered) {
		if !has(c) {
			return false
		}
	}
	return true
}
