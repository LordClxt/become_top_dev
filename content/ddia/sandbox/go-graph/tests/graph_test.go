package lab

import (
	"errors"
	"reflect"
	"testing"
)

// La figure 2-5 du livre, simplifiée : Lucy (née en Idaho) et Alain (né à Beaune) vivent à Londres.
const (
	namerica = iota + 1
	usa
	idaho
	europe
	france
	beaune
	uk
	england
	london
	lucy
	alain
	bob
)

func world(t *testing.T) *Graph {
	g := NewGraph()
	for id, name := range map[int]string{
		namerica: "North America", usa: "United States", idaho: "Idaho", europe: "Europe", france: "France",
		beaune: "Beaune", uk: "United Kingdom", england: "England", london: "London", lucy: "Lucy", alain: "Alain", bob: "Bob",
	} {
		g.AddVertex(id, map[string]string{"name": name})
	}
	add := func(tail, head int, label string) {
		t.Helper()
		if _, err := g.AddEdge(tail, head, label); err != nil {
			t.Fatal(err)
		}
	}
	add(idaho, usa, "within")
	add(usa, namerica, "within")
	add(beaune, france, "within")
	add(france, europe, "within")
	add(london, england, "within")
	add(england, uk, "within")
	add(uk, europe, "within")
	add(lucy, idaho, "born_in")
	add(lucy, london, "lives_in")
	add(alain, beaune, "born_in")
	add(alain, london, "lives_in")
	add(bob, usa, "born_in") // né directement « aux États-Unis » (0 saut)
	add(bob, idaho, "lives_in")
	return g
}

func TestAddEdge(t *testing.T) {
	g := NewGraph()
	g.AddVertex(1, nil)
	g.AddVertex(2, nil)
	if id, err := g.AddEdge(1, 2, "knows"); err != nil || id != 1 {
		t.Errorf("AddEdge = %d, %v, attendu 1, nil", id, err)
	}
	if id, err := g.AddEdge(2, 1, "knows"); err != nil || id != 2 {
		t.Errorf("deuxième arête = %d, %v, attendu 2", id, err)
	}
	if _, err := g.AddEdge(1, 99, "knows"); !errors.Is(err, ErrNoVertex) {
		t.Errorf("tête inconnue : %v, attendu ErrNoVertex", err)
	}
	if _, err := g.AddEdge(99, 1, "knows"); !errors.Is(err, ErrNoVertex) {
		t.Errorf("queue inconnue : %v, attendu ErrNoVertex", err)
	}
	if n := g.Neighbors(1, "knows", Outgoing); !reflect.DeepEqual(n, []int{2}) {
		t.Errorf("Neighbors = %v, attendu [2] (les arêtes refusées ne comptent pas)", n)
	}
}

func TestNeighborsBothDirections(t *testing.T) {
	g := world(t)
	if got := g.Neighbors(usa, "within", Incoming); !reflect.DeepEqual(got, []int{idaho}) {
		t.Errorf("entrants within de usa = %v", got)
	}
	if got := g.Neighbors(usa, "within", Outgoing); !reflect.DeepEqual(got, []int{namerica}) {
		t.Errorf("sortants within de usa = %v", got)
	}
	if got := g.Neighbors(usa, "born_in", Incoming); !reflect.DeepEqual(got, []int{bob}) {
		t.Errorf("l'étiquette compte : %v", got)
	}
	if got := g.Neighbors(usa, "inconnu", Incoming); len(got) != 0 {
		t.Errorf("étiquette inconnue : %v", got)
	}
}

func TestReachIncludesZeroHops(t *testing.T) {
	g := world(t)
	if got := g.Reach(usa, "within", Incoming); !reflect.DeepEqual(got, []int{usa, idaho}) {
		t.Errorf("Reach(usa, within, Incoming) = %v, attendu [usa idaho] — le sommet de départ (0 saut) en fait partie", got)
	}
	if got := g.Reach(europe, "within", Incoming); !reflect.DeepEqual(got, []int{europe, france, beaune, uk, england, london}) {
		t.Errorf("Reach(europe) = %v", got)
	}
	if got := g.Reach(idaho, "within", Outgoing); !reflect.DeepEqual(got, []int{namerica, usa, idaho}) {
		t.Errorf("Reach(idaho, Outgoing) = %v, attendu [1 2 3] (trié par identifiant)", got)
	}
	if got := g.Reach(999, "within", Incoming); got != nil {
		t.Errorf("départ inconnu : %v, attendu nil", got)
	}
}

func TestReachHandlesCycles(t *testing.T) {
	g := NewGraph()
	for i := 1; i <= 3; i++ {
		g.AddVertex(i, nil)
	}
	g.AddEdge(1, 2, "x")
	g.AddEdge(2, 3, "x")
	g.AddEdge(3, 1, "x")
	if got := g.Reach(1, "x", Outgoing); !reflect.DeepEqual(got, []int{1, 2, 3}) {
		t.Errorf("Reach sur un cycle = %v, attendu [1 2 3] (et surtout : terminer)", got)
	}
}

func TestMigrated(t *testing.T) {
	g := world(t)
	if got := g.Migrated("United States", "Europe"); !reflect.DeepEqual(got, []string{"Lucy"}) {
		t.Errorf("Migrated(US → Europe) = %v, attendu [Lucy]", got)
	}
	if got := g.Migrated("Europe", "Europe"); !reflect.DeepEqual(got, []string{"Alain"}) {
		t.Errorf("Migrated(Europe → Europe) = %v, attendu [Alain]", got)
	}
	// Bob est né directement dans le sommet « United States » (0 saut) et vit en Idaho, donc en Amérique du Nord.
	if got := g.Migrated("United States", "North America"); !reflect.DeepEqual(got, []string{"Bob"}) {
		t.Errorf("Migrated(US → North America) = %v, attendu [Bob] — né à 0 saut du pays", got)
	}
	if got := g.Migrated("Atlantis", "Europe"); len(got) != 0 {
		t.Errorf("lieu inconnu : %v", got)
	}
}

func TestMigratedNoDuplicates(t *testing.T) {
	g := world(t)
	g.AddEdge(lucy, london, "lives_in") // deuxième arête identique
	g.AddEdge(lucy, idaho, "born_in")
	if got := g.Migrated("United States", "Europe"); !reflect.DeepEqual(got, []string{"Lucy"}) {
		t.Errorf("doublons : %v, attendu [Lucy] une seule fois", got)
	}
}

func TestFindByName(t *testing.T) {
	g := world(t)
	g.AddVertex(100, map[string]string{"name": "Idaho"})
	if got := g.FindByName("Idaho"); !reflect.DeepEqual(got, []int{idaho, 100}) {
		t.Errorf("FindByName = %v, attendu [3 100]", got)
	}
	if got := g.FindByName("x"); len(got) != 0 {
		t.Errorf("inconnu : %v", got)
	}
}
