package lab

import (
	"errors"
	"fmt"
	"sort"
	"strconv"
)

// Table range ses données par colonne : un tableau de valeurs par nom de colonne, toutes de même longueur.
type Table struct {
	names []string
	cols  map[string][]string
	n     int
}

// New crée une table vide avec ces colonnes, dans cet ordre.
func New(names ...string) *Table {
	t := &Table{names: append([]string(nil), names...), cols: map[string][]string{}}
	for _, name := range names {
		t.cols[name] = nil
	}
	return t
}

// Append ajoute une ligne : une valeur par colonne, dans l'ordre de New.
func (t *Table) Append(row ...string) error {
	if len(row) != len(t.names) {
		return fmt.Errorf("ligne de %d valeurs pour %d colonnes", len(row), len(t.names))
	}
	for i, name := range t.names {
		t.cols[name] = append(t.cols[name], row[i])
	}
	t.n++
	return nil
}

// Len renvoie le nombre de lignes.
func (t *Table) Len() int { return t.n }

// Column renvoie une copie d'une colonne, ou nil si elle n'existe pas.
func (t *Table) Column(name string) []string {
	c, ok := t.cols[name]
	if !ok {
		return nil
	}
	return append([]string{}, c...)
}

// Row reconstitue la i-ième ligne (dans l'ordre des colonnes), ou nil si i est hors limites.
func (t *Table) Row(i int) []string {
	if i < 0 || i >= t.n {
		return nil
	}
	row := make([]string, len(t.names))
	for j, name := range t.names {
		row[j] = t.cols[name][i]
	}
	return row
}

// Bitmap renvoie un booléen par ligne : vrai si la ligne vaut value.
func Bitmap(col []string, value string) []bool {
	out := make([]bool, len(col))
	for i, v := range col {
		out[i] = v == value
	}
	return out
}

// And renvoie le ET bit à bit de deux bitmaps de même longueur, ou nil si les longueurs diffèrent.
func And(a, b []bool) []bool {
	if len(a) != len(b) {
		return nil
	}
	out := make([]bool, len(a))
	for i := range a {
		out[i] = a[i] && b[i]
	}
	return out
}

// Or renvoie le OU bit à bit de deux bitmaps de même longueur, ou nil si les longueurs diffèrent.
func Or(a, b []bool) []bool {
	if len(a) != len(b) {
		return nil
	}
	out := make([]bool, len(a))
	for i := range a {
		out[i] = a[i] || b[i]
	}
	return out
}

// Encode compresse un bitmap en longueurs de séquences alternées, en commençant par une séquence de faux
// (éventuellement de longueur 0). Un bitmap vide donne une slice vide non nil.
func Encode(bits []bool) []int {
	runs := []int{}
	cur, count := false, 0
	for _, b := range bits {
		if b == cur {
			count++
			continue
		}
		runs = append(runs, count)
		cur, count = b, 1
	}
	if len(bits) > 0 {
		runs = append(runs, count)
	}
	return runs
}

// Decode est l'inverse d'Encode. Une longueur négative est ignorée.
func Decode(runs []int) []bool {
	out := []bool{}
	cur := false
	for _, r := range runs {
		for i := 0; i < r; i++ {
			out = append(out, cur)
		}
		cur = !cur
	}
	return out
}

// SortBy trie les lignes entières (de façon stable) selon ces colonnes, dans l'ordre, par comparaison de chaînes.
func (t *Table) SortBy(names ...string) error {
	for _, name := range names {
		if _, ok := t.cols[name]; !ok {
			return errors.New("colonne inconnue : " + name)
		}
	}
	idx := make([]int, t.n)
	for i := range idx {
		idx[i] = i
	}
	sort.SliceStable(idx, func(a, b int) bool {
		for _, name := range names {
			va, vb := t.cols[name][idx[a]], t.cols[name][idx[b]]
			if va != vb {
				return va < vb
			}
		}
		return false
	})
	for _, name := range t.names {
		old := t.cols[name]
		sorted := make([]string, t.n)
		for i, j := range idx {
			sorted[i] = old[j]
		}
		t.cols[name] = sorted
	}
	return nil
}

// Runs compte les séquences de valeurs identiques consécutives dans une colonne.
func Runs(col []string) int {
	n := 0
	for i := range col {
		if i == 0 || col[i] != col[i-1] {
			n++
		}
	}
	return n
}

// SumWhere additionne la colonne measure (des entiers) sur les lignes qui vérifient tous les filtres colonne = valeur.
// Sans filtre, toutes les lignes comptent. Colonne inconnue ou valeur non entière : erreur.
func (t *Table) SumWhere(measure string, filters map[string]string) (int, error) {
	m, ok := t.cols[measure]
	if !ok {
		return 0, errors.New("colonne inconnue : " + measure)
	}
	keep := make([]bool, t.n)
	for i := range keep {
		keep[i] = true
	}
	for name, value := range filters {
		col, ok := t.cols[name]
		if !ok {
			return 0, errors.New("colonne inconnue : " + name)
		}
		keep = And(keep, Bitmap(col, value))
	}
	sum := 0
	for i, k := range keep {
		if !k {
			continue
		}
		v, err := strconv.Atoi(m[i])
		if err != nil {
			return 0, fmt.Errorf("valeur non entière dans %s : %q", measure, m[i])
		}
		sum += v
	}
	return sum, nil
}
