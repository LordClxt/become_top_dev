package lab

import (
	"slices"
	"testing"
)

func TestJoinInts(t *testing.T) {
	cases := []struct {
		name string
		dst  string
		nums []int
		sep  byte
		want string
	}{
		{"liste simple", "", []int{1, 22, 333}, ',', "1,22,333"},
		{"un seul nombre", "", []int{7}, ',', "7"},
		{"séparateur différent", "", []int{1, 2, 3}, ' ', "1 2 3"},
		{"négatifs et zéro", "", []int{-5, 0, 12, -300}, ';', "-5;0;12;-300"},
		{"ajoute à dst", "ids=", []int{4, 5}, ',', "ids=4,5"},
		{"liste vide", "x", nil, ',', "x"},
		{"grands nombres", "", []int{1 << 40, -1 << 40}, ',', "1099511627776,-1099511627776"},
	}
	for _, c := range cases {
		if got := string(JoinInts([]byte(c.dst), c.nums, c.sep)); got != c.want {
			t.Errorf("%s : %q, attendu %q", c.name, got, c.want)
		}
	}
}

func TestJoinIntsDoesNotAllocate(t *testing.T) {
	nums := []int{10, -20, 30, 400, 5000, 60000}
	dst := make([]byte, 0, 128)
	allocs := testing.AllocsPerRun(100, func() {
		dst = JoinInts(dst[:0], nums, ',')
	})
	if allocs != 0 {
		t.Errorf("%.0f allocation(s) par appel avec un tampon assez grand, attendu 0 — strconv.AppendInt écrit directement dans dst", allocs)
	}
	if string(dst) != "10,-20,30,400,5000,60000" {
		t.Errorf("résultat = %q", dst)
	}
}

func TestCountVowels(t *testing.T) {
	cases := map[string]int{
		"":                     0,
		"Hello World":          3,
		"rhythm":               1, // le y compte
		"AEIOUY":               6,
		"aeiouy":               6,
		"Été à Noël":           5,
		"çà et là, où ça va ?": 7,
		"bcdfg":                0,
		"日本語 and ünï":          3,
		"Ÿ ÿ":                  2,
	}
	for in, want := range cases {
		if got := CountVowels(in); got != want {
			t.Errorf("CountVowels(%q) = %d, attendu %d", in, got, want)
		}
	}
}

func TestCountVowelsDoesNotAllocate(t *testing.T) {
	text := "Ça va très bien, merci beaucoup ÉTÉ — Où est la bibliothèque ?"
	total := 0
	allocs := testing.AllocsPerRun(100, func() {
		total += CountVowels(text)
	})
	if allocs != 0 {
		t.Errorf("%.0f allocation(s) par appel, attendu 0 — convertir en []rune ou en minuscules alloue : parcours la string avec range", allocs)
	}
	if total == 0 {
		t.Errorf("rien compté")
	}
}

func TestDedupe(t *testing.T) {
	cases := []struct{ in, want []int }{
		{[]int{1, 1, 2, 2, 2, 3}, []int{1, 2, 3}},
		{[]int{1, 2, 3}, []int{1, 2, 3}},
		{[]int{5, 5, 5, 5}, []int{5}},
		{[]int{7}, []int{7}},
		{[]int{}, []int{}},
		{[]int{-3, -3, 0, 0, 4}, []int{-3, 0, 4}},
		{[]int{1, 2, 1}, []int{1, 2, 1}}, // seuls les doublons consécutifs disparaissent
		{[]int{1, 1, 2, 3, 3, 3, 4, 4}, []int{1, 2, 3, 4}},
	}
	for _, c := range cases {
		in := slices.Clone(c.in)
		got := Dedupe(in)
		if !slices.Equal(got, c.want) {
			t.Errorf("Dedupe(%v) = %v, attendu %v", c.in, got, c.want)
		}
	}
	if got := Dedupe(nil); len(got) != 0 {
		t.Errorf("Dedupe(nil) = %v", got)
	}
}

func TestDedupeWorksInPlace(t *testing.T) {
	xs := []int{1, 1, 2, 3, 3}
	got := Dedupe(xs)
	if len(got) != 3 || &got[0] != &xs[0] {
		t.Errorf("le résultat doit réutiliser le tableau de xs (même première case), longueur %d", len(got))
	}
	if xs[0] != 1 || xs[1] != 2 || xs[2] != 3 {
		t.Errorf("les premiers éléments de xs doivent contenir le résultat : %v", xs)
	}

	data := make([]int, 1000)
	for i := range data {
		data[i] = i / 10
	}
	work := make([]int, len(data))
	allocs := testing.AllocsPerRun(50, func() {
		copy(work, data)
		_ = Dedupe(work)
	})
	if allocs != 0 {
		t.Errorf("%.0f allocation(s) : Dedupe doit travailler sur place, sans nouvelle slice", allocs)
	}
}
