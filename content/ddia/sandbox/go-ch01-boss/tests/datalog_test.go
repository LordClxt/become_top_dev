package lab

import (
	"reflect"
	"testing"
)

func a(pred string, args ...string) Atom { return Atom{Pred: pred, Args: args} }

func strs(atoms []Atom) []string {
	out := []string{}
	for _, x := range atoms {
		out = append(out, x.String())
	}
	return out
}

// Les faits et les règles de l'exemple 2-10 / 2-11 du livre (avec l'Europe en plus). Les constantes sont en minuscules :
// une majuscule initiale en ferait des variables.
func world() ([]Atom, []Rule) {
	facts := []Atom{
		a("name", "namerica", "north_america"), a("name", "usa", "united_states"), a("name", "idaho", "idaho_name"),
		a("name", "europe", "europe_name"), a("name", "france", "france_name"), a("name", "beaune", "beaune_name"), a("name", "lucy", "lucy_name"), a("name", "alain", "alain_name"),
		a("within", "usa", "namerica"), a("within", "idaho", "usa"), a("within", "beaune", "france"), a("within", "france", "europe"),
		a("born_in", "lucy", "idaho"), a("born_in", "alain", "beaune"),
		a("lives_in", "lucy", "beaune"), a("lives_in", "alain", "beaune"),
	}
	rules := []Rule{
		{Head: a("within_recursive", "Location", "Name"), Body: []Atom{a("name", "Location", "Name")}},
		{Head: a("within_recursive", "Location", "Name"), Body: []Atom{a("within", "Location", "Via"), a("within_recursive", "Via", "Name")}},
		{Head: a("migrated", "Name", "BornIn", "LivingIn"), Body: []Atom{
			a("name", "Person", "Name"), a("born_in", "Person", "BornLoc"), a("within_recursive", "BornLoc", "BornIn"),
			a("lives_in", "Person", "LivingLoc"), a("within_recursive", "LivingLoc", "LivingIn"),
		}},
	}
	return facts, rules
}

func TestAtomString(t *testing.T) {
	if got := a("within", "idaho", "usa").String(); got != "within(idaho, usa)" {
		t.Errorf("String = %q", got)
	}
}

func TestEvalTheBookExample(t *testing.T) {
	facts, rules := world()
	db := Eval(facts, rules)
	got := Query(db, a("migrated", "Who", "united_states", "europe_name"))
	want := []map[string]string{{"Who": "lucy_name"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("migrated(Who, UnitedStates, Europe) = %v, attendu %v", got, want)
	}
	// Idaho est dans l'Amérique du Nord par deux sauts (règle 2 appliquée deux fois).
	if got := Query(db, a("within_recursive", "idaho", "north_america")); len(got) != 1 {
		t.Errorf("within_recursive(idaho, NorthAmerica) devrait être dérivé : %v", got)
	}
	if got := Query(db, a("within_recursive", "idaho", "europe_name")); len(got) != 0 {
		t.Errorf("within_recursive(idaho, Europe) ne doit pas être dérivé : %v", got)
	}
}

func TestEvalIsSortedAndDeduplicated(t *testing.T) {
	facts := []Atom{a("p", "b"), a("p", "a"), a("p", "a")}
	rules := []Rule{{Head: a("q", "X"), Body: []Atom{a("p", "X")}}, {Head: a("q", "X"), Body: []Atom{a("p", "X")}}}
	got := strs(Eval(facts, rules))
	want := []string{"p(a)", "p(b)", "q(a)", "q(b)"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Eval = %v, attendu %v (sans doublon, triés)", got, want)
	}
}

func TestEvalTransitiveClosureWithCycle(t *testing.T) {
	facts := []Atom{a("edge", "a", "b"), a("edge", "b", "c"), a("edge", "c", "a"), a("edge", "c", "d")}
	rules := []Rule{
		{Head: a("path", "X", "Y"), Body: []Atom{a("edge", "X", "Y")}},
		{Head: a("path", "X", "Z"), Body: []Atom{a("edge", "X", "Y"), a("path", "Y", "Z")}},
	}
	db := Eval(facts, rules)
	var paths []string
	for _, f := range db {
		if f.Pred == "path" {
			paths = append(paths, f.String())
		}
	}
	// Depuis a, b et c on atteint a, b, c, d (12 chemins), depuis d rien.
	if len(paths) != 12 {
		t.Errorf("%d chemins, attendu 12 : %v — la boucle a→b→c→a doit se terminer au point fixe", len(paths), paths)
	}
	if got := Query(db, a("path", "d", "X")); len(got) != 0 {
		t.Errorf("rien n'est atteignable depuis d : %v", got)
	}
}

func TestEvalRepeatedVariableAndConstants(t *testing.T) {
	facts := []Atom{a("likes", "ann", "ann"), a("likes", "ann", "bob"), a("likes", "bob", "bob"), a("age", "ann", "30")}
	rules := []Rule{
		{Head: a("narcissist", "X"), Body: []Atom{a("likes", "X", "X")}},
		{Head: a("adult"), Body: []Atom{a("age", "ann", "30")}}, // atome sans variable
	}
	db := Eval(facts, rules)
	got := Query(db, a("narcissist", "Who"))
	want := []map[string]string{{"Who": "ann"}, {"Who": "bob"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("narcissist = %v, attendu %v — une variable répétée doit recevoir la même valeur", got, want)
	}
	if got := Query(db, a("adult")); len(got) != 1 || len(got[0]) != 0 {
		t.Errorf("motif sans variable : %v, attendu une association vide", got)
	}
}

func TestEvalIgnoresUnsafeRules(t *testing.T) {
	facts := []Atom{a("p", "a")}
	rules := []Rule{{Head: a("q", "X", "Y"), Body: []Atom{a("p", "X")}}} // Y n'est lié nulle part
	got := strs(Eval(facts, rules))
	if !reflect.DeepEqual(got, []string{"p(a)"}) {
		t.Errorf("règle non sûre : %v, elle doit être ignorée", got)
	}
}

func TestEvalDoesNotModifyInputsAndHandlesEmpty(t *testing.T) {
	if got := Eval(nil, nil); len(got) != 0 {
		t.Errorf("Eval(nil, nil) = %v", got)
	}
	facts := []Atom{a("p", "b"), a("p", "a")}
	Eval(facts, nil)
	if facts[0].String() != "p(b)" {
		t.Error("Eval ne doit pas trier ni modifier les faits de l'appelant")
	}
}

func TestQueryBindingsOrderAndDedup(t *testing.T) {
	db := []Atom{a("r", "b", "1"), a("r", "a", "1"), a("r", "a", "2"), a("s", "a")}
	got := Query(db, a("r", "X", "1"))
	want := []map[string]string{{"X": "a"}, {"X": "b"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Query = %v, attendu %v (ordre des faits triés)", got, want)
	}
	// La variable n'apparaît qu'une fois dans le résultat même si plusieurs faits donnent la même association.
	got = Query(db, a("r", "X", "Y"))
	if len(got) != 3 {
		t.Errorf("Query(r(X, Y)) = %v, attendu 3 associations", got)
	}
	if got := Query(db, a("zzz", "X")); got == nil || len(got) != 0 {
		t.Errorf("sans correspondance : %#v, attendu une slice vide non nil", got)
	}
}

func TestQueryDeduplicatesBindings(t *testing.T) {
	db := []Atom{a("r", "a", "1"), a("r", "a", "2")}
	got := Query(db, a("r", "X", "Y"))
	if len(got) != 2 {
		t.Fatalf("%v", got)
	}
	got = Query(db, a("r", "X", "_"))
	// "_" est une constante ici (pas de majuscule) : aucun fait ne correspond
	if len(got) != 0 {
		t.Errorf("« _ » n'est pas une variable dans ce mini-Datalog : %v", got)
	}
}
