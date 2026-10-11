package lab

import (
	"fmt"
	"math/rand"
	"sort"
	"testing"
)

func key(i int) string { return fmt.Sprintf("k%06d", i) }

func TestSmallTreeNeverSplits(t *testing.T) {
	tr := New(4)
	for i := 0; i < 4; i++ {
		tr.Put(key(i), fmt.Sprint(i))
	}
	if tr.Height() != 1 || tr.Splits() != 0 || tr.Len() != 4 {
		t.Errorf("hauteur=%d splits=%d len=%d, attendu 1, 0, 4 : une page qui n'est pas pleine n'éclate pas", tr.Height(), tr.Splits(), tr.Len())
	}
	tr.Put(key(4), "4") // 5 clés > maxKeys
	if tr.Height() != 2 || tr.Splits() != 1 {
		t.Errorf("après débordement : hauteur=%d splits=%d, attendu 2 et 1 — la racine éclate, l'arbre gagne un niveau", tr.Height(), tr.Splits())
	}
	for i := 0; i < 5; i++ {
		if v, ok := tr.Get(key(i)); !ok || v != fmt.Sprint(i) {
			t.Errorf("Get(%s) = %q, %v", key(i), v, ok)
		}
	}
}

func TestUpdateDoesNotGrow(t *testing.T) {
	tr := New(4)
	for i := 0; i < 50; i++ {
		tr.Put(key(i), "a")
	}
	h, s, n := tr.Height(), tr.Splits(), tr.Len()
	for i := 0; i < 50; i++ {
		tr.Put(key(i), "b")
	}
	if tr.Height() != h || tr.Splits() != s || tr.Len() != n {
		t.Errorf("mettre à jour une clé existante ne doit ni éclater ni changer Len")
	}
	if v, _ := tr.Get(key(7)); v != "b" {
		t.Errorf("valeur non mise à jour : %q", v)
	}
}

func TestAscendingDescendingAndRandomInsertions(t *testing.T) {
	orders := map[string]func(n int) []int{
		"croissant": func(n int) []int {
			s := make([]int, n)
			for i := range s {
				s[i] = i
			}
			return s
		},
		"décroissant": func(n int) []int {
			s := make([]int, n)
			for i := range s {
				s[i] = n - 1 - i
			}
			return s
		},
		"aléatoire": func(n int) []int { return rand.New(rand.NewSource(7)).Perm(n) },
	}
	for name, order := range orders {
		for _, maxKeys := range []int{3, 4, 7, 32} {
			tr := New(maxKeys)
			const n = 2000
			for _, i := range order(n) {
				tr.Put(key(i), fmt.Sprint(i))
			}
			if tr.Len() != n {
				t.Fatalf("%s/%d : Len = %d", name, maxKeys, tr.Len())
			}
			for i := 0; i < n; i++ {
				if v, ok := tr.Get(key(i)); !ok || v != fmt.Sprint(i) {
					t.Fatalf("%s/%d : Get(%s) = %q, %v", name, maxKeys, key(i), v, ok)
				}
			}
			if _, ok := tr.Get("absent"); ok {
				t.Fatalf("%s/%d : clé absente trouvée", name, maxKeys)
			}
			all := tr.Range("", "")
			if len(all) != n || !sort.StringsAreSorted(all) {
				t.Fatalf("%s/%d : Range complet = %d clés, triées=%v", name, maxKeys, len(all), sort.StringsAreSorted(all))
			}
		}
	}
}

func TestHeightIsLogarithmic(t *testing.T) {
	tr := New(100)
	for _, i := range rand.New(rand.NewSource(1)).Perm(20000) {
		tr.Put(key(i), "v")
	}
	if tr.Height() > 3 {
		t.Errorf("20 000 clés avec 100 clés par page : hauteur %d, attendu ≤ 3 (profondeur en O(log n))", tr.Height())
	}
	small := New(4)
	for i := 0; i < 1000; i++ {
		small.Put(key(i), "v")
	}
	if small.Height() > 11 {
		t.Errorf("1 000 clés avec 4 clés par page : hauteur %d, trop haute — l'arbre n'est pas équilibré", small.Height())
	}
	if small.Splits() == 0 {
		t.Error("des éclatements étaient attendus")
	}
}

func TestRange(t *testing.T) {
	tr := New(4)
	for _, i := range rand.New(rand.NewSource(3)).Perm(200) {
		tr.Put(key(i*2), "v") // clés paires
	}
	cases := []struct {
		lo, hi string
		want   int
		first  string
	}{
		{key(10), key(20), 5, key(10)}, // 10 12 14 16 18
		{key(11), key(21), 5, key(12)}, // bornes absentes
		{key(0), key(2), 1, key(0)},    // un seul élément
		{key(390), "", 5, key(390)},    // sans borne haute : 390 392 394 396 398
		{"", key(6), 3, key(0)},        // sans borne basse
		{key(400), key(500), 0, ""},    // après la fin
		{key(10), key(10), 0, ""},      // intervalle vide
	}
	for _, c := range cases {
		got := tr.Range(c.lo, c.hi)
		if len(got) != c.want || (c.want > 0 && got[0] != c.first) {
			t.Errorf("Range(%q, %q) = %v (%d), attendu %d clés commençant par %q", c.lo, c.hi, got, len(got), c.want, c.first)
		}
		if !sort.StringsAreSorted(got) {
			t.Errorf("Range(%q, %q) n'est pas triée", c.lo, c.hi)
		}
	}
}

func TestMinimumMaxKeys(t *testing.T) {
	tr := New(1) // ramené à 3
	for i := 0; i < 100; i++ {
		tr.Put(key(i), "v")
	}
	if tr.Len() != 100 || len(tr.Range("", "")) != 100 {
		t.Error("New(1) doit se comporter comme New(3)")
	}
}
