package lab

import (
	"strings"
	"testing"
)

func TestCounter(t *testing.T) {
	c := Counter(5)
	for _, want := range []int{5, 6, 7, 8} {
		if got := c(); got != want {
			t.Fatalf("Counter(5) a renvoyé %d, attendu %d", got, want)
		}
	}
	a, b := Counter(0), Counter(100)
	if a() != 0 || a() != 1 || b() != 100 || a() != 2 || b() != 101 {
		t.Errorf("deux compteurs doivent être indépendants")
	}
	if n := Counter(-2); n() != -2 || n() != -1 || n() != 0 {
		t.Errorf("Counter(-2) doit compter à partir de -2")
	}
}

func TestPrefixer(t *testing.T) {
	hello := Prefixer("Hello ")
	if got := hello("Bob"); got != "Hello Bob" {
		t.Errorf("hello(Bob) = %q", got)
	}
	if got := hello("Maria"); got != "Hello Maria" {
		t.Errorf("hello(Maria) = %q", got)
	}
	bye := Prefixer("Bye ")
	if hello("X") != "Hello X" || bye("X") != "Bye X" {
		t.Errorf("deux fonctions fabriquées doivent garder chacune leur préfixe")
	}
	if got := Prefixer("")("x"); got != "x" {
		t.Errorf("préfixe vide : %q", got)
	}
	if got := Prefixer(">")(""); got != ">" {
		t.Errorf("argument vide : %q", got)
	}
}

func TestMemoize(t *testing.T) {
	calls := 0
	square := func(n int) int { calls++; return n * n }
	fast := Memoize(square)

	if fast(4) != 16 || fast(4) != 16 || fast(4) != 16 {
		t.Fatalf("Memoize doit renvoyer le bon résultat")
	}
	if calls != 1 {
		t.Errorf("f appelée %d fois pour le même argument, attendu 1", calls)
	}
	if fast(5) != 25 || fast(-3) != 9 {
		t.Errorf("résultats faux pour d'autres arguments")
	}
	if calls != 3 {
		t.Errorf("f appelée %d fois pour trois arguments distincts, attendu 3", calls)
	}
	fast(5)
	fast(-3)
	fast(4)
	if calls != 3 {
		t.Errorf("tout est déjà en cache, f ne doit plus être appelée (appels : %d)", calls)
	}
}

func TestMemoizeCachesZeroResults(t *testing.T) {
	calls := 0
	zero := Memoize(func(n int) int { calls++; return n * 0 })
	zero(3)
	zero(3)
	zero(3)
	if calls != 1 {
		t.Errorf("un résultat égal à 0 doit être mis en cache aussi : f appelée %d fois (idiome comma ok)", calls)
	}
}

func TestMemoizeKeepsSeparateCaches(t *testing.T) {
	double := Memoize(func(n int) int { return n * 2 })
	triple := Memoize(func(n int) int { return n * 3 })
	if double(7) != 14 || triple(7) != 21 || double(7) != 14 {
		t.Errorf("chaque fonction mémoïsée doit avoir son propre cache")
	}
}

func TestChain(t *testing.T) {
	pipeline := Chain(strings.TrimSpace, strings.ToUpper, Prefixer(">> "))
	if got := pipeline("   hi there "); got != ">> HI THERE" {
		t.Errorf("Chain = %q, attendu %q", got, ">> HI THERE")
	}
	if got := Chain()("inchangé"); got != "inchangé" {
		t.Errorf("Chain() doit être l'identité : %q", got)
	}
	// L'ordre compte.
	a := Chain(Prefixer("a"), Prefixer("b"))
	if got := a("-"); got != "ba-" {
		t.Errorf("Chain(a, b)(-) = %q, attendu \"ba-\" : a s'applique d'abord", got)
	}
}

func TestChainIgnoresLaterChangesToTheCallersSlice(t *testing.T) {
	fns := []func(string) string{strings.ToUpper}
	chain := Chain(fns...)
	fns[0] = strings.ToLower // l'appelant réutilise sa slice
	if got := chain("MiXed"); got != "MIXED" {
		t.Errorf("la chaîne a changé de comportement après coup : %q — copie fns, la closure ne doit pas partager la slice de l'appelant", got)
	}
}

func TestSortPeople(t *testing.T) {
	people := []Person{{"Pat", "Patterson", 37}, {"Tracy", "Bobdaughter", 23}, {"Fred", "Fredson", 18}}

	SortPeople(people, func(a, b Person) bool { return a.LastName < b.LastName })
	if people[0].LastName != "Bobdaughter" || people[1].LastName != "Fredson" || people[2].LastName != "Patterson" {
		t.Errorf("tri par nom : %v", people)
	}
	SortPeople(people, func(a, b Person) bool { return a.Age < b.Age })
	if people[0].Age != 18 || people[1].Age != 23 || people[2].Age != 37 {
		t.Errorf("tri par âge : %v", people)
	}
	SortPeople(people, func(a, b Person) bool { return a.Age > b.Age })
	if people[0].Age != 37 || people[2].Age != 18 {
		t.Errorf("tri par âge décroissant : %v", people)
	}
}

func TestSortPeopleIsStable(t *testing.T) {
	people := []Person{
		{"A", "X", 30}, {"B", "X", 20}, {"C", "X", 30}, {"D", "X", 20}, {"E", "X", 30}, {"F", "X", 20},
	}
	SortPeople(people, func(a, b Person) bool { return a.Age < b.Age })
	var order []string
	for _, p := range people {
		order = append(order, p.FirstName)
	}
	if got := strings.Join(order, ""); got != "BDFACE" {
		t.Errorf("tri non stable : %s, attendu BDFACE (à âge égal, l'ordre d'origine est conservé)", got)
	}
}

func TestSortPeopleEmpty(t *testing.T) {
	SortPeople(nil, func(a, b Person) bool { return a.Age < b.Age })
	SortPeople([]Person{}, func(a, b Person) bool { return a.Age < b.Age })
}
