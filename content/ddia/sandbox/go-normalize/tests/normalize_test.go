package lab

import (
	"reflect"
	"testing"
)

func sample() []Profile {
	return []Profile{
		{UserID: 1, Name: "Ada", Positions: []Position{{"Analyste", "Maison Babbage"}, {"Autrice", "Éditions Taylor"}}},
		{UserID: 2, Name: "Alan", Positions: []Position{{"Cryptanalyste", "Bletchley"}, {"Chercheur", "Maison Babbage"}}},
		{UserID: 3, Name: "Grace"},
		{UserID: 4, Name: "Linus", Positions: []Position{{"Ingénieur", "Maison Babbage"}}},
	}
}

func TestNormalizeDeduplicatesOrganizations(t *testing.T) {
	db := Normalize(sample())
	wantOrgs := []OrgRow{{1, "Maison Babbage"}, {2, "Éditions Taylor"}, {3, "Bletchley"}}
	if !reflect.DeepEqual(db.Orgs, wantOrgs) {
		t.Errorf("Orgs = %v, attendu %v — un nom, une ligne, numérotée par ordre de première apparition", db.Orgs, wantOrgs)
	}
	if len(db.Users) != 4 || len(db.Positions) != 5 {
		t.Errorf("%d utilisateurs et %d postes, attendu 4 et 5", len(db.Users), len(db.Positions))
	}
	want := PositionRow{UserID: 4, Title: "Ingénieur", OrgID: 1}
	if got := db.Positions[4]; got != want {
		t.Errorf("dernier poste = %+v, attendu %+v", got, want)
	}
}

func TestJoinRoundTrip(t *testing.T) {
	in := sample()
	out := Normalize(in).Join()
	if !reflect.DeepEqual(in, out) {
		t.Errorf("Join(Normalize(x)) = %+v, attendu x = %+v", out, in)
	}
}

func TestEmpty(t *testing.T) {
	db := Normalize(nil)
	if len(db.Users)+len(db.Orgs)+len(db.Positions) != 0 || len(db.Join()) != 0 {
		t.Errorf("entrée vide : %+v", db)
	}
}

func TestRenameOrgChangesOneRow(t *testing.T) {
	db := Normalize(sample())
	if !db.RenameOrg(1, "Analytical Engines") {
		t.Fatal("RenameOrg(1) = false")
	}
	if db.RenameOrg(99, "x") {
		t.Error("RenameOrg d'un identifiant inconnu doit renvoyer false")
	}
	count := 0
	for _, p := range db.Join() {
		for _, pos := range p.Positions {
			if pos.Organization == "Analytical Engines" {
				count++
			}
		}
	}
	if count != 3 {
		t.Errorf("%d CV voient le nouveau nom, attendu 3 : une seule ligne modifiée suffit à les corriger tous", count)
	}
	if db.Orgs[0].Name != "Analytical Engines" || db.Orgs[1].Name != "Éditions Taylor" {
		t.Errorf("Orgs = %v", db.Orgs)
	}
}

func TestRenameInDocumentsCountsCopies(t *testing.T) {
	docs := sample()
	if n := RenameInDocuments(docs, "Maison Babbage", "Analytical Engines"); n != 3 {
		t.Errorf("copies réécrites = %d, attendu 3 : c'est le coût de la duplication", n)
	}
	if docs[3].Positions[0].Organization != "Analytical Engines" {
		t.Error("le document 4 n'a pas été modifié")
	}
	if n := RenameInDocuments(docs, "Inconnue", "x"); n != 0 {
		t.Errorf("organisation absente : %d, attendu 0", n)
	}
}
