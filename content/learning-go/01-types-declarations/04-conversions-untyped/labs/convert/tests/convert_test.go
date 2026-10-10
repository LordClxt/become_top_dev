package lab

import (
	"math"
	"testing"
)

func near(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestAverage(t *testing.T) {
	cases := []struct {
		xs   []int
		want float64
		why  string
	}{
		{[]int{1, 2}, 1.5, "la moyenne de 1 et 2 est décimale : convertis avant de diviser"},
		{[]int{7}, 7, "un seul élément"},
		{[]int{-1, -2}, -1.5, "valeurs négatives"},
		{[]int{1, 2, 2}, 5.0 / 3, "résultat non entier"},
		{[]int{}, 0, "une slice vide renvoie 0 sans paniquer"},
		{nil, 0, "nil se comporte comme une slice vide"},
	}
	for _, c := range cases {
		if got := Average(c.xs); !near(got, c.want) {
			t.Errorf("Average(%v) = %v, attendu %v — %s", c.xs, got, c.want, c.why)
		}
	}
}

func TestPercent(t *testing.T) {
	cases := []struct {
		part, total int
		want        float64
		why         string
	}{
		{1, 3, 100.0 / 3, "1/3 en entiers vaudrait 0 : convertis d'abord"},
		{3, 2, 150, "une part peut dépasser le total"},
		{0, 10, 0, "zéro"},
		{5, 0, 0, "un total nul renvoie 0 au lieu de +Inf"},
		{0, 0, 0, "0/0 renverrait NaN : à éviter"},
		{50, 200, 25, "cas simple"},
	}
	for _, c := range cases {
		if got := Percent(c.part, c.total); !near(got, c.want) || math.IsNaN(got) {
			t.Errorf("Percent(%d, %d) = %v, attendu %v — %s", c.part, c.total, got, c.want, c.why)
		}
	}
}

func TestClampToByte(t *testing.T) {
	cases := []struct {
		in   int
		want byte
		why  string
	}{
		{-5, 0, "négatif : plancher à 0"},
		{0, 0, "borne basse"},
		{100, 100, "dans la plage"},
		{255, 255, "borne haute"},
		{256, 255, "256 ferait le tour jusqu'à 0 avec byte(256) : il faut plafonner"},
		{300, 255, "300 ferait le tour jusqu'à 44"},
		{1 << 40, 255, "très grand"},
		{-1 << 40, 0, "très petit"},
	}
	for _, c := range cases {
		if got := ClampToByte(c.in); got != c.want {
			t.Errorf("ClampToByte(%d) = %d, attendu %d — %s", c.in, got, c.want, c.why)
		}
	}
}

func TestNarrowToInt32(t *testing.T) {
	cases := []struct {
		in   int64
		want int32
		ok   bool
	}{
		{0, 0, true},
		{42, 42, true},
		{math.MaxInt32, math.MaxInt32, true},
		{math.MinInt32, math.MinInt32, true},
		{math.MaxInt32 + 1, 0, false},
		{math.MinInt32 - 1, 0, false},
		{math.MaxInt64, 0, false},
		{math.MinInt64, 0, false},
	}
	for _, c := range cases {
		got, ok := NarrowToInt32(c.in)
		if got != c.want || ok != c.ok {
			t.Errorf("NarrowToInt32(%d) = (%d, %v), attendu (%d, %v) — quand ok vaut false, la valeur renvoyée est 0", c.in, got, ok, c.want, c.ok)
		}
	}
}

func TestRoundToInt(t *testing.T) {
	cases := []struct {
		in   float64
		want int
		why  string
	}{
		{2.4, 2, "arrondi vers le bas"},
		{2.5, 3, "demi : on s'éloigne de zéro"},
		{2.6, 3, "arrondi vers le haut"},
		{-2.4, -2, "négatif, vers le haut"},
		{-2.5, -3, "demi négatif : on s'éloigne de zéro, int(f) donnerait -2"},
		{-2.7, -3, "int(-2.7) tronque à -2, il faut arrondir"},
		{0.5, 1, "demi positif"},
		{-0.5, -1, "demi négatif"},
		{0, 0, "zéro"},
		{1e6 + 0.4, 1000000, "grand nombre"},
	}
	for _, c := range cases {
		if got := RoundToInt(c.in); got != c.want {
			t.Errorf("RoundToInt(%v) = %d, attendu %d — %s", c.in, got, c.want, c.why)
		}
	}
}
