package lab

import (
	"reflect"
	"testing"
)

// Des recommandations qui référencent leur auteur (users) et l'organisation concernée (orgs).
func seeded() *Store {
	s := NewStore()
	for _, u := range []string{"u1", "u2", "u3"} {
		s.Put("users", u, Doc{"name": "Utilisateur " + u})
	}
	s.Put("orgs", "o1", Doc{"name": "Maison Babbage"})
	s.Put("orgs", "o2", Doc{"name": "Éditions Taylor"})
	for i, ids := range [][2]string{{"u1", "o1"}, {"u2", "o1"}, {"u1", "o2"}, {"u3", "o2"}, {"u1", "o1"}, {"u2", "o2"}} {
		s.Put("recs", string(rune('a'+i)), Doc{"text": "reco " + string(rune('a'+i)), "author": ids[0], "org": ids[1]})
	}
	return s
}

var refs = map[string]string{"author": "users", "org": "orgs"}
var ids = []string{"a", "b", "c", "d", "e", "f"}

func TestExpandResolvesReferences(t *testing.T) {
	s := seeded()
	got := Expand(s, "recs", ids, refs)
	if len(got) != 6 {
		t.Fatalf("%d documents, attendu 6", len(got))
	}
	first := got[0]
	if first["text"] != "reco a" {
		t.Errorf("le premier document est %v, l'ordre de ids doit être conservé", first)
	}
	author, _ := first["author"].(Doc)
	org, _ := first["org"].(Doc)
	if author["name"] != "Utilisateur u1" || org["name"] != "Maison Babbage" {
		t.Errorf("références non résolues : author=%v org=%v", first["author"], first["org"])
	}
}

func TestExpandMatchesNaive(t *testing.T) {
	a := Expand(seeded(), "recs", ids, refs)
	b := ExpandNaive(seeded(), "recs", ids, refs)
	if !reflect.DeepEqual(a, b) {
		t.Errorf("Expand et ExpandNaive doivent donner le même résultat\n  Expand : %v\n  Naive  : %v", a, b)
	}
}

func TestQueryCounts(t *testing.T) {
	naive := seeded()
	ExpandNaive(naive, "recs", ids, refs)
	if naive.Queries() != 18 {
		t.Errorf("ExpandNaive a émis %d requêtes, attendu 18 (6 documents × (1 + 2 références))", naive.Queries())
	}
	batched := seeded()
	Expand(batched, "recs", ids, refs)
	if batched.Queries() != 3 {
		t.Errorf("Expand a émis %d requêtes, attendu 3 (1 pour les documents + 1 par champ de référence)", batched.Queries())
	}
}

func TestGetManyCountsOneQuery(t *testing.T) {
	s := seeded()
	got := s.GetMany("users", []string{"u1", "u3", "inconnu"})
	if len(got) != 2 || got["u1"] == nil || got["u3"] == nil {
		t.Errorf("GetMany = %v", got)
	}
	if s.Queries() != 1 {
		t.Errorf("GetMany compte %d requêtes, attendu 1", s.Queries())
	}
	if len(s.GetMany("users", nil)) != 0 || s.Queries() != 1 {
		t.Error("GetMany(ids vide) ne doit émettre aucune requête")
	}
	s.Get("users", "u1")
	if s.Queries() != 2 {
		t.Errorf("Queries = %d, attendu 2", s.Queries())
	}
}

func TestExpandEdgeCases(t *testing.T) {
	s := seeded()
	s.Put("recs", "x", Doc{"text": "orpheline", "author": "disparu", "org": 42})
	s.Put("recs", "y", Doc{"text": "sans référence"})
	for name, expand := range map[string]func(*Store, string, []string, map[string]string) []Doc{"Expand": Expand, "ExpandNaive": ExpandNaive} {
		got := expand(s, "recs", []string{"manquant", "x", "y"}, refs)
		if len(got) != 2 {
			t.Errorf("%s : %d documents, attendu 2 (l'identifiant manquant est ignoré)", name, len(got))
			continue
		}
		if v, present := got[0]["author"]; !present || v != nil {
			t.Errorf("%s : une référence introuvable doit devenir nil, obtenu %v", name, got[0]["author"])
		}
		if got[0]["org"] != 42 {
			t.Errorf("%s : un champ qui n'est pas une chaîne reste tel quel, obtenu %v", name, got[0]["org"])
		}
		if _, present := got[1]["author"]; present {
			t.Errorf("%s : un champ absent ne doit pas apparaître", name)
		}
	}
	if got := Expand(NewStore(), "recs", nil, refs); len(got) != 0 {
		t.Errorf("sans identifiant : %v", got)
	}
}

func TestExpandDoesNotMutateStoredDocuments(t *testing.T) {
	s := seeded()
	Expand(s, "recs", ids, refs)
	ExpandNaive(s, "recs", ids, refs)
	d, _ := s.Get("recs", "a")
	if d["author"] != "u1" {
		t.Errorf("le document stocké a été modifié : %v", d)
	}
}
