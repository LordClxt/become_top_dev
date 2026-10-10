package lab

import (
	"maps"
	"slices"
	"testing"
)

func TestBirthday(t *testing.T) {
	p := Person{Name: "Ada", Age: 30}
	q := Birthday(p)
	if q != (Person{Name: "Ada", Age: 31}) {
		t.Errorf("Birthday(%v) = %v", p, q)
	}
	if p.Age != 30 {
		t.Errorf("la personne d'origine a changé : %v — une struct est passée par valeur, on renvoie la copie modifiée", p)
	}
	if r := Birthday(Birthday(q)); r.Age != 33 {
		t.Errorf("appels enchaînés : %v", r)
	}
}

func TestClamp(t *testing.T) {
	scores := map[string]int{"ada": 120, "bob": -5, "cy": 50, "di": 100, "ed": 0}
	Clamp(scores)
	want := map[string]int{"ada": 100, "bob": 0, "cy": 50, "di": 100, "ed": 0}
	if !maps.Equal(scores, want) {
		t.Errorf("après Clamp : %v, attendu %v — la map de l'appelant doit être modifiée", scores, want)
	}
	Clamp(nil)               // ne doit pas paniquer
	Clamp(map[string]int{}) // idem
}

func TestWithout(t *testing.T) {
	s := []int{1, 2, 3, 4}
	got := Without(s, 1)
	if !slices.Equal(got, []int{1, 3, 4}) {
		t.Errorf("Without(s, 1) = %v, attendu [1 3 4]", got)
	}
	if !slices.Equal(s, []int{1, 2, 3, 4}) {
		t.Errorf("la slice de l'appelant a été modifiée : %v — append(s[:i], s[i+1:]...) réécrit le tableau partagé", s)
	}
	cases := []struct {
		i    int
		want []int
	}{
		{0, []int{2, 3, 4}}, {3, []int{1, 2, 3}}, {4, []int{1, 2, 3, 4}}, {-1, []int{1, 2, 3, 4}}, {100, []int{1, 2, 3, 4}},
	}
	for _, c := range cases {
		if got := Without(s, c.i); !slices.Equal(got, c.want) {
			t.Errorf("Without(s, %d) = %v, attendu %v", c.i, got, c.want)
		}
	}
	if got := Without(nil, 0); len(got) != 0 {
		t.Errorf("Without(nil, 0) = %v", got)
	}
	// Le résultat ne doit pas partager son tableau avec s.
	r := Without(s, 3)
	r[0] = 99
	if s[0] != 1 {
		t.Errorf("modifier le résultat a modifié la slice d'origine : le résultat partage son tableau")
	}
}

func TestReverse(t *testing.T) {
	cases := []struct{ in, want []int }{
		{[]int{1, 2, 3}, []int{3, 2, 1}},
		{[]int{1, 2, 3, 4}, []int{4, 3, 2, 1}},
		{[]int{7}, []int{7}},
		{[]int{}, []int{}},
		{nil, nil},
	}
	for _, c := range cases {
		Reverse(c.in)
		if !slices.Equal(c.in, c.want) {
			t.Errorf("après Reverse : %v, attendu %v", c.in, c.want)
		}
	}
	// Une sous-slice partage le tableau de son parent : inverser l'une modifie l'autre.
	parent := []int{1, 2, 3, 4}
	Reverse(parent[1:3])
	if !slices.Equal(parent, []int{1, 3, 2, 4}) {
		t.Errorf("Reverse sur une sous-slice : parent = %v, attendu [1 3 2 4]", parent)
	}
}

func TestResize(t *testing.T) {
	s := []int{1, 2, 3}
	cases := []struct {
		n    int
		want []int
	}{
		{5, []int{1, 2, 3, 0, 0}}, {3, []int{1, 2, 3}}, {2, []int{1, 2}}, {0, []int{}}, {-4, []int{}},
	}
	for _, c := range cases {
		if got := Resize(s, c.n); !slices.Equal(got, c.want) || len(got) != max(c.n, 0) {
			t.Errorf("Resize(s, %d) = %v, attendu %v", c.n, got, c.want)
		}
	}
	if !slices.Equal(s, []int{1, 2, 3}) {
		t.Errorf("Resize a modifié la slice d'origine : %v", s)
	}
	r := Resize(s, 2)
	r[0] = 99
	if s[0] != 1 {
		t.Errorf("le résultat de Resize partage son tableau avec la slice d'origine : modifier l'un modifie l'autre")
	}
	if got := Resize(nil, 2); !slices.Equal(got, []int{0, 0}) {
		t.Errorf("Resize(nil, 2) = %v", got)
	}
}
