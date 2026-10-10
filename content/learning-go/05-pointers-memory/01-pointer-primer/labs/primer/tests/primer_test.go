package lab

import "testing"

func TestPtr(t *testing.T) {
	p := Ptr(5)
	if p == nil || *p != 5 {
		t.Fatalf("Ptr(5) = %v", p)
	}
	q := Ptr(5)
	if p == q {
		t.Errorf("deux appels doivent renvoyer deux pointeurs distincts")
	}
	*p = 9
	if *q != 5 {
		t.Errorf("modifier un pointeur a modifié l'autre : %d", *q)
	}
	if s := Ptr("go"); s == nil || *s != "go" {
		t.Errorf("Ptr(\"go\") = %v", s)
	}
	type point struct{ X, Y int }
	if pt := Ptr(point{1, 2}); pt.X != 1 || pt.Y != 2 {
		t.Errorf("Ptr(struct) = %v", pt)
	}
	if b := Ptr(false); b == nil || *b {
		t.Errorf("Ptr(false) doit pointer vers false : %v", b)
	}
}

func TestDeref(t *testing.T) {
	if got := Deref(nil, 7); got != 7 {
		t.Errorf("Deref(nil, 7) = %d, attendu 7", got)
	}
	if got := Deref(Ptr(3), 7); got != 3 {
		t.Errorf("Deref(&3, 7) = %d, attendu 3", got)
	}
	if got := Deref(Ptr(0), 7); got != 0 {
		t.Errorf("Deref(&0, 7) = %d, attendu 0 : un pointeur vers la valeur zéro n'est pas un pointeur absent", got)
	}
	if got := Deref[string](nil, "défaut"); got != "défaut" {
		t.Errorf("Deref[string](nil) = %q", got)
	}
	if got := Deref(Ptr(""), "défaut"); got != "" {
		t.Errorf("une string vide pointée n'est pas absente : %q", got)
	}
}

func TestSwap(t *testing.T) {
	a, b := 1, 2
	Swap(&a, &b)
	if a != 2 || b != 1 {
		t.Errorf("après Swap : a = %d, b = %d, attendu 2 et 1", a, b)
	}
	c := 5
	Swap(&c, &c)
	if c != 5 {
		t.Errorf("Swap(&c, &c) = %d, attendu 5", c)
	}
	Swap(nil, &a)
	Swap(&a, nil)
	Swap(nil, nil)
	if a != 2 {
		t.Errorf("un pointeur nil ne doit rien changer : a = %d", a)
	}
}

func TestIncrementAll(t *testing.T) {
	a, b, c := 0, 10, -1
	IncrementAll(&a, nil, &b, &c, &a)
	if a != 2 || b != 11 || c != 0 {
		t.Errorf("après IncrementAll : %d %d %d, attendu 2 11 0 (a est pointé deux fois)", a, b, c)
	}
	IncrementAll()
	IncrementAll(nil, nil)
}

func TestLargest(t *testing.T) {
	xs := []int{3, 9, 2, 9, 4}
	p := Largest(xs)
	if p == nil || *p != 9 {
		t.Fatalf("Largest = %v", p)
	}
	if p != &xs[1] {
		t.Errorf("Largest doit pointer vers la première case maximale de la slice elle-même, pas vers une copie")
	}
	*p = 0
	if xs[1] != 0 {
		t.Errorf("écrire à travers le pointeur doit modifier la slice : %v", xs)
	}
	if got := Largest([]int{-5, -2, -9}); got == nil || *got != -2 {
		t.Errorf("Largest de négatifs = %v", got)
	}
	if Largest(nil) != nil || Largest([]int{}) != nil {
		t.Errorf("Largest d'une slice vide doit renvoyer nil")
	}
	single := []int{4}
	if Largest(single) != &single[0] {
		t.Errorf("slice d'un seul élément")
	}
}

func TestFullName(t *testing.T) {
	middle := "Perry"
	empty := ""
	spaces := "   "
	cases := []struct {
		name string
		p    Person
		want string
	}{
		{"avec deuxième prénom", Person{"Pat", &middle, "Peterson"}, "Pat Perry Peterson"},
		{"sans deuxième prénom", Person{"Pat", nil, "Peterson"}, "Pat Peterson"},
		{"deuxième prénom vide", Person{"Pat", &empty, "Peterson"}, "Pat Peterson"},
		{"deuxième prénom d'espaces", Person{"Pat", &spaces, "Peterson"}, "Pat Peterson"},
		{"avec Ptr", Person{"Ada", Ptr("Augusta"), "Lovelace"}, "Ada Augusta Lovelace"},
	}
	for _, c := range cases {
		if got := FullName(c.p); got != c.want {
			t.Errorf("%s : FullName = %q, attendu %q", c.name, got, c.want)
		}
	}
}
