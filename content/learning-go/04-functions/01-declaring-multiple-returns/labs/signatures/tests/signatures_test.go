package lab

import (
	"errors"
	"math"
	"slices"
	"testing"
)

func TestMinMax(t *testing.T) {
	cases := []struct {
		vals   []int
		lo, hi int
		ok     bool
	}{
		{[]int{3}, 3, 3, true},
		{[]int{3, 1, 2}, 1, 3, true},
		{[]int{-5, -9, -1}, -9, -1, true},
		{[]int{7, 7, 7}, 7, 7, true},
		{[]int{0, -3, 8, 8, -3}, -3, 8, true},
		{nil, 0, 0, false},
		{[]int{}, 0, 0, false},
	}
	for _, c := range cases {
		lo, hi, ok := MinMax(c.vals...)
		if lo != c.lo || hi != c.hi || ok != c.ok {
			t.Errorf("MinMax(%v) = (%d, %d, %v), attendu (%d, %d, %v)", c.vals, lo, hi, ok, c.lo, c.hi, c.ok)
		}
	}
	if lo, hi, ok := MinMax(4, 9, 2); lo != 2 || hi != 9 || !ok {
		t.Errorf("MinMax(4, 9, 2) avec des arguments séparés = (%d, %d, %v)", lo, hi, ok)
	}
	if _, _, ok := MinMax(); ok {
		t.Errorf("MinMax() sans argument doit renvoyer ok = false")
	}
}

func TestStats(t *testing.T) {
	cases := []struct {
		vals         []float64
		mean, median float64
	}{
		{[]float64{5}, 5, 5},
		{[]float64{1, 2, 3}, 2, 2},
		{[]float64{1, 2, 3, 4}, 2.5, 2.5},
		{[]float64{9, 1, 5}, 5, 5},
		{[]float64{10, 0, 0, 10}, 5, 5},
		{[]float64{1, 1, 1, 100}, 25.75, 1},
		{[]float64{-2, 2}, 0, 0},
	}
	for _, c := range cases {
		mean, median, err := Stats(c.vals...)
		if err != nil || math.Abs(mean-c.mean) > 1e-9 || math.Abs(median-c.median) > 1e-9 {
			t.Errorf("Stats(%v) = (%v, %v, %v), attendu (%v, %v, nil)", c.vals, mean, median, err, c.mean, c.median)
		}
	}
}

func TestStatsNoValues(t *testing.T) {
	if _, _, err := Stats(); !errors.Is(err, ErrNoValues) {
		t.Errorf("Stats() : erreur %v, attendu ErrNoValues", err)
	}
	var none []float64
	if _, _, err := Stats(none...); !errors.Is(err, ErrNoValues) {
		t.Errorf("Stats(nil...) : erreur %v, attendu ErrNoValues", err)
	}
}

func TestStatsDoesNotModifyCallerSlice(t *testing.T) {
	xs := []float64{9, 1, 5, 3, 7}
	original := slices.Clone(xs)
	if _, _, err := Stats(xs...); err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(xs, original) {
		t.Errorf("Stats a modifié la slice de l'appelant : %v, attendu %v — avec xs..., la fonction reçoit la même slice : copie avant de trier", xs, original)
	}
}

func TestJoin(t *testing.T) {
	items := []string{"a", "b", "c"}
	cases := []struct {
		name  string
		items []string
		opts  FormatOptions
		want  string
	}{
		{"options par défaut", items, FormatOptions{}, "a,b,c"},
		{"séparateur", items, FormatOptions{Separator: " | "}, "a | b | c"},
		{"préfixe", items, FormatOptions{Prefix: "#"}, "#a,#b,#c"},
		{"préfixe et séparateur", items, FormatOptions{Prefix: "@", Separator: " "}, "@a @b @c"},
		{"limite", items, FormatOptions{Max: 2}, "a,b,…(+1)"},
		{"limite avec séparateur et préfixe", []string{"x", "y", "z", "w", "v"}, FormatOptions{Prefix: "-", Separator: ";", Max: 3}, "-x;-y;-z;…(+2)"},
		{"limite non atteinte", items, FormatOptions{Max: 3}, "a,b,c"},
		{"limite plus grande que la liste", items, FormatOptions{Max: 10}, "a,b,c"},
		{"limite négative = pas de limite", items, FormatOptions{Max: -1}, "a,b,c"},
		{"aucun élément", nil, FormatOptions{Prefix: "#", Max: 2}, ""},
		{"un seul élément", []string{"solo"}, FormatOptions{Prefix: "#"}, "#solo"},
	}
	for _, c := range cases {
		if got := Join(c.items, c.opts); got != c.want {
			t.Errorf("%s : Join(%v, %+v) = %q, attendu %q", c.name, c.items, c.opts, got, c.want)
		}
	}
}

func TestJoinDoesNotModifyItems(t *testing.T) {
	items := []string{"a", "b", "c"}
	_ = Join(items, FormatOptions{Prefix: "#", Max: 2})
	if !slices.Equal(items, []string{"a", "b", "c"}) {
		t.Errorf("Join a modifié sa slice d'entrée : %v", items)
	}
}
