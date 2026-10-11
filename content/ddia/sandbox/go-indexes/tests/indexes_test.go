package lab

import (
	"reflect"
	"testing"
)

var (
	last  = func(r Row) string { return r.Last }
	first = func(r Row) string { return r.First }
	city  = func(r Row) string { return r.City }
)

func people() []Row {
	return []Row{
		{1, "Dupont", "Marie", "Paris"},
		{2, "Dupont", "Jean", "Lyon"},
		{3, "Durand", "Marie", "Paris"},
		{4, "Du", "Marie", "Lille"},
		{5, "Martin", "Jean", "Paris"},
		{6, "Dupont", "Marie", "Lyon"},
	}
}

func TestSecondaryIndex(t *testing.T) {
	s := NewSecondary(city)
	// ordre d'insertion volontairement désordonné
	for _, i := range []int{4, 0, 5, 2, 3, 1} {
		s.Add(people()[i])
	}
	s.Add(people()[0]) // doublon
	if got := s.Lookup("Paris"); !reflect.DeepEqual(got, []int{1, 3, 5}) {
		t.Errorf("Lookup(Paris) = %v, attendu [1 3 5] (clés non uniques → liste d'identifiants triée, sans doublon)", got)
	}
	if got := s.Lookup("Nice"); len(got) != 0 {
		t.Errorf("valeur inconnue : %v", got)
	}
	got := s.Lookup("Lyon")
	got[0] = 999
	if again := s.Lookup("Lyon"); again[0] == 999 {
		t.Error("Lookup doit renvoyer une copie")
	}
}

func TestSecondaryRemove(t *testing.T) {
	s := NewSecondary(city)
	for _, r := range people() {
		s.Add(r)
	}
	s.Remove(people()[2]) // id 3, Paris
	s.Remove(people()[2]) // déjà retiré : sans effet
	s.Remove(Row{ID: 42, City: "Paris"})
	if got := s.Lookup("Paris"); !reflect.DeepEqual(got, []int{1, 5}) {
		t.Errorf("Lookup(Paris) = %v, attendu [1 5]", got)
	}
	s.Remove(people()[3]) // Lille n'avait que lui
	if got := s.Lookup("Lille"); len(got) != 0 {
		t.Errorf("Lille : %v", got)
	}
}

func TestConcatIndexUsesThePrefix(t *testing.T) {
	c := NewConcat(last, first)
	for _, r := range people() {
		c.Add(r)
	}
	if got := c.Lookup("Dupont"); !reflect.DeepEqual(got, []int{2, 1, 6}) {
		t.Errorf("Lookup(Dupont) = %v, attendu [2 1 6] : (Dupont, Jean) puis (Dupont, Marie) triés par identifiant", got)
	}
	if got := c.Lookup("Dupont", "Marie"); !reflect.DeepEqual(got, []int{1, 6}) {
		t.Errorf("Lookup(Dupont, Marie) = %v, attendu [1 6]", got)
	}
	if got := c.Lookup("Du"); !reflect.DeepEqual(got, []int{4}) {
		t.Errorf("Lookup(Du) = %v, attendu [4] — « Du » n'est pas un préfixe de « Dupont » au sens des colonnes", got)
	}
	if got := c.Lookup("Dupont", "Paul"); len(got) != 0 {
		t.Errorf("combinaison absente : %v", got)
	}
	if got := c.Lookup(); !reflect.DeepEqual(got, []int{4, 2, 1, 6, 3, 5}) {
		t.Errorf("préfixe vide = %v, attendu tout l'index dans l'ordre (nom, prénom, id)", got)
	}
	if got := c.Lookup("a", "b", "c"); got != nil {
		t.Errorf("préfixe trop long : %v", got)
	}
}

func TestConcatIndexIsUselessForTheSecondColumnAlone(t *testing.T) {
	// L'annuaire (nom, prénom) ne retrouve pas « tous les Marie » sans tout parcourir : Lookup("Marie") cherche un NOM.
	c := NewConcat(last, first)
	for _, r := range people() {
		c.Add(r)
	}
	if got := c.Lookup("Marie"); len(got) != 0 {
		t.Errorf("Lookup(Marie) = %v : le premier élément du préfixe est le nom de famille", got)
	}
	// Dans l'autre ordre, la recherche par prénom fonctionne.
	f := NewConcat(first, last)
	for _, r := range people() {
		f.Add(r)
	}
	if got := f.Lookup("Marie"); !reflect.DeepEqual(got, []int{4, 1, 6, 3}) {
		t.Errorf("index (prénom, nom) : %v, attendu [4 1 6 3]", got)
	}
}

func TestUsablePrefix(t *testing.T) {
	idx := []string{"last", "first", "city"}
	cases := []struct {
		constrained []string
		want        int
	}{
		{[]string{"last"}, 1},
		{[]string{"last", "first"}, 2},
		{[]string{"last", "first", "city"}, 3},
		{[]string{"first"}, 0},
		{[]string{"last", "city"}, 1},
		{nil, 0},
	}
	for _, c := range cases {
		m := map[string]bool{}
		for _, col := range c.constrained {
			m[col] = true
		}
		if got := UsablePrefix(idx, m); got != c.want {
			t.Errorf("UsablePrefix(%v, %v) = %d, attendu %d", idx, c.constrained, got, c.want)
		}
	}
}

func TestCovers(t *testing.T) {
	index := []string{"last", "first"}
	included := []string{"phone"}
	cases := []struct {
		selected, filtered []string
		want               bool
	}{
		{[]string{"phone"}, []string{"last"}, true},
		{[]string{"phone", "first"}, []string{"last", "first"}, true},
		{[]string{"address"}, []string{"last"}, false},
		{[]string{"phone"}, []string{"city"}, false},
		{nil, nil, true},
	}
	for _, c := range cases {
		if got := Covers(index, included, c.selected, c.filtered); got != c.want {
			t.Errorf("Covers(select %v, where %v) = %v, attendu %v", c.selected, c.filtered, got, c.want)
		}
	}
}
