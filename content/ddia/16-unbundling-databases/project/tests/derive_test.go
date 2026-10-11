package lab

import (
	"errors"
	"reflect"
	"strings"
	"testing"
)

func put(off int64, key, city, country string) Event {
	doc := map[string]string{}
	if city != "" {
		doc["city"] = city
	}
	if country != "" {
		doc["country"] = country
	}
	return Event{Offset: off, Key: key, Doc: doc}
}

func del(off int64, key string) Event { return Event{Offset: off, Key: key, Deleted: true} }

// genLog fabrique un log déterministe de n événements (mises à jour, déplacements, suppressions).
func genLog(n int) []Event {
	cities := []string{"Lyon", "Paris", "Nantes", "Bruxelles", "Liège", "Genève"}
	countries := map[string]string{"Lyon": "FR", "Paris": "FR", "Nantes": "FR", "Bruxelles": "BE", "Liège": "BE", "Genève": "CH"}
	seed := uint32(42)
	next := func(m int) int { seed = seed*1664525 + 1013904223; return int(seed>>8) % m }
	log := make([]Event, 0, n)
	for i := 1; i <= n; i++ {
		key := "u" + string(rune('a'+next(12)))
		if next(7) == 0 {
			log = append(log, del(int64(i), key))
			continue
		}
		c := cities[next(len(cities))]
		log = append(log, put(int64(i), key, c, countries[c]))
	}
	return log
}

func mustApply(t *testing.T, v View, evs ...Event) {
	t.Helper()
	for _, ev := range evs {
		if err := v.Apply(ev); err != nil {
			t.Fatalf("Apply(offset %d) : erreur inattendue %v", ev.Offset, err)
		}
	}
}

// ---------- Jalon 1 ----------

func TestM1IndexLookup(t *testing.T) {
	ix := NewIndex("city")
	mustApply(t, ix,
		put(1, "a", "Lyon", "FR"),
		put(2, "b", "Lyon", "FR"),
		put(3, "c", "Paris", "FR"),
		put(4, "a", "Paris", "FR"), // a déménage
		del(5, "b"),
		put(6, "d", "", "FR"), // pas de ville : non indexé
		put(7, "c", "", ""),   // c perd sa ville : sort de l'index
	)
	cases := []struct {
		value string
		want  []string
	}{
		{"Lyon", []string{}},
		{"Paris", []string{"a"}},
		{"Nantes", []string{}},
		{"", []string{}},
	}
	for _, c := range cases {
		got := ix.Lookup(c.value)
		if len(got) != len(c.want) || (len(got) > 0 && !reflect.DeepEqual(got, c.want)) {
			t.Errorf("Lookup(%q) = %v, attendu %v — un document qui change de valeur, est supprimé ou perd le champ doit quitter son ancienne entrée", c.value, got, c.want)
		}
	}
	if ix.Offset() != 7 {
		t.Errorf("Offset() = %d, attendu 7", ix.Offset())
	}
}

func TestM1IndexSortedCopy(t *testing.T) {
	ix := NewIndex("city")
	mustApply(t, ix, put(1, "zoé", "Lyon", ""), put(2, "ana", "Lyon", ""), put(3, "marc", "Lyon", ""))
	got := ix.Lookup("Lyon")
	if !reflect.DeepEqual(got, []string{"ana", "marc", "zoé"}) {
		t.Fatalf("Lookup(Lyon) = %v, attendu les clés triées [ana marc zoé]", got)
	}
	got[0] = "pirate"
	if again := ix.Lookup("Lyon"); again[0] != "ana" {
		t.Error("modifier le résultat de Lookup a modifié l'index : renvoie une copie")
	}
}

func TestM1IndexIdempotent(t *testing.T) {
	ix := NewIndex("city")
	mustApply(t, ix, put(1, "a", "Lyon", ""), put(2, "a", "Paris", ""))
	// Livraison au moins une fois : l'événement 1 revient, puis le 2 est relivré.
	mustApply(t, ix, put(1, "a", "Lyon", ""), put(2, "a", "Paris", ""))
	if got := ix.Lookup("Lyon"); len(got) != 0 {
		t.Errorf("après relivraison de l'offset 1, Lookup(Lyon) = %v, attendu [] — un offset déjà appliqué doit être ignoré", got)
	}
	if got := ix.Lookup("Paris"); !reflect.DeepEqual(got, []string{"a"}) {
		t.Errorf("Lookup(Paris) = %v, attendu [a]", got)
	}
	if ix.Offset() != 2 {
		t.Errorf("Offset() = %d après relivraison, attendu 2", ix.Offset())
	}
}

func TestM1IndexErrors(t *testing.T) {
	ix := NewIndex("city")
	mustApply(t, ix, put(3, "a", "Lyon", ""))
	cases := []struct {
		name string
		ev   Event
		want error
	}{
		{"offset nul", put(0, "b", "Lyon", ""), ErrBadOffset},
		{"offset négatif", put(-4, "b", "Lyon", ""), ErrBadOffset},
		{"clé vide", put(9, "", "Lyon", ""), ErrEmptyKey},
	}
	for _, c := range cases {
		if err := ix.Apply(c.ev); !errors.Is(err, c.want) {
			t.Errorf("%s : err = %v, attendu %v", c.name, err, c.want)
		}
	}
	if ix.Offset() != 3 || len(ix.Lookup("Lyon")) != 1 {
		t.Error("un événement invalide ne doit ni avancer l'offset ni modifier l'index")
	}
}

// ---------- Jalon 2 ----------

func TestM2CounterCounts(t *testing.T) {
	c := NewCounter(Field("city"))
	mustApply(t, c,
		put(1, "a", "Lyon", ""),
		put(2, "b", "Lyon", ""),
		put(3, "c", "Paris", ""),
		put(4, "a", "Paris", ""),
		del(5, "b"),
		del(6, "zz"), // supprimer un inconnu ne change rien
		put(7, "c", "Paris", ""),
	)
	want := map[string]int{"Paris": 2}
	if got := c.Counts(); !reflect.DeepEqual(got, want) {
		t.Errorf("Counts() = %v, attendu %v — décrémente l'ancien groupe avant d'incrémenter le nouveau, et retire les groupes à 0", got, want)
	}
	if c.Count("Lyon") != 0 || c.Count("Paris") != 2 {
		t.Errorf("Count(Lyon) = %d, Count(Paris) = %d ; attendu 0 et 2", c.Count("Lyon"), c.Count("Paris"))
	}
	snap := c.Counts()
	snap["Paris"] = 99
	if c.Count("Paris") != 2 {
		t.Error("modifier le résultat de Counts a modifié la vue : renvoie une copie")
	}
}

func TestM2CounterKeyFunc(t *testing.T) {
	norm := func(doc map[string]string) (string, bool) {
		v := strings.ToLower(strings.TrimSpace(doc["city"]))
		return v, v != ""
	}
	c := NewCounter(norm)
	mustApply(t, c, put(1, "a", " Lyon", ""), put(2, "b", "LYON", ""), put(3, "c", "  ", ""))
	if got := c.Counts(); !reflect.DeepEqual(got, map[string]int{"lyon": 2}) {
		t.Errorf("Counts() = %v, attendu map[lyon:2] — c'est la KeyFunc qui définit le groupe", got)
	}
}

func TestM2CatchUp(t *testing.T) {
	log := genLog(60)
	c := NewCounter(Field("city"))
	n, err := CatchUp(c, log[:20])
	if err != nil || n != 20 {
		t.Fatalf("CatchUp(log[:20]) = %d, %v ; attendu 20, nil", n, err)
	}
	// Reprise après un arrêt : on relit un peu trop tôt, les doublons sont ignorés.
	n, err = CatchUp(c, log[10:])
	if err != nil || n != 40 {
		t.Fatalf("CatchUp(log[10:]) = %d, %v ; attendu 40 (les 10 premiers sont déjà appliqués)", n, err)
	}
	if c.Offset() != 60 {
		t.Errorf("Offset() = %d, attendu 60", c.Offset())
	}

	bad := []Event{put(1, "a", "Lyon", ""), put(3, "b", "Lyon", ""), put(2, "c", "Paris", "")}
	fresh := NewCounter(Field("city"))
	if _, err := CatchUp(fresh, bad); !errors.Is(err, ErrOutOfOrder) {
		t.Errorf("log non ordonné : err = %v, attendu ErrOutOfOrder", err)
	}
	if fresh.Offset() != 0 || len(fresh.Counts()) != 0 {
		t.Error("un log non ordonné doit être refusé AVANT d'appliquer quoi que ce soit")
	}
}

func TestM2RebuildEqualsIncremental(t *testing.T) {
	log := genLog(300)
	inc := NewCounter(Field("city"))
	idx := NewIndex("city")
	// Incrémental avec livraison au moins une fois : chaque lot de 25 est relivré en partie.
	for start := 0; start < len(log); start += 25 {
		end := min(start+25, len(log))
		from := max(0, start-7)
		for _, ev := range log[from:end] {
			mustApply(t, inc, ev)
			mustApply(t, idx, ev)
		}
	}
	rebuilt := NewCounter(Field("city"))
	if _, err := CatchUp(rebuilt, log); err != nil {
		t.Fatal(err)
	}
	rIdx := NewIndex("city")
	if _, err := CatchUp(rIdx, log); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(inc.Counts(), rebuilt.Counts()) {
		t.Errorf("compteurs incrémentaux %v ≠ reconstruits %v — la dérivation doit être déterministe et idempotente", inc.Counts(), rebuilt.Counts())
	}
	for _, city := range []string{"Lyon", "Paris", "Nantes", "Bruxelles", "Liège", "Genève"} {
		if a, b := idx.Lookup(city), rIdx.Lookup(city); !reflect.DeepEqual(a, b) {
			t.Errorf("index %s : incrémental %v ≠ reconstruit %v", city, a, b)
		}
		if len(idx.Lookup(city)) != inc.Count(city) {
			t.Errorf("%s : l'index liste %d clés mais le compteur dit %d — deux vues du même log doivent concorder", city, len(idx.Lookup(city)), inc.Count(city))
		}
	}
}

// ---------- Jalon 3 ----------

func TestM3MigrationLifecycle(t *testing.T) {
	log := genLog(120)
	old := NewCounter(Field("city"))
	if _, err := CatchUp(old, log[:50]); err != nil {
		t.Fatal(err)
	}
	next := NewCounter(Field("country"))
	m := NewMigration(old, next)

	if m.Current() != View(old) {
		t.Fatal("avant la bascule, Current() doit renvoyer l'ancienne vue")
	}
	if m.Ready() {
		t.Error("Ready() = true alors que la nouvelle vue est vide")
	}
	if err := m.Switch(); !errors.Is(err, ErrNotCaughtUp) {
		t.Errorf("Switch() avant rattrapage : err = %v, attendu ErrNotCaughtUp", err)
	}
	if err := m.Retire(); !errors.Is(err, ErrNotSwitched) {
		t.Errorf("Retire() avant bascule : err = %v, attendu ErrNotSwitched", err)
	}

	// Le flux continue pendant le rattrapage : 50..80 arrivent en direct.
	for _, ev := range log[50:80] {
		if err := m.Apply(ev); err != nil {
			t.Fatal(err)
		}
	}
	if old.Offset() != 80 {
		t.Errorf("l'ancienne vue doit suivre le flux pendant la migration : offset %d, attendu 80", old.Offset())
	}
	if err := m.Backfill(log[:80]); err != nil {
		t.Fatal(err)
	}
	if !m.Ready() {
		t.Fatalf("après Backfill, Ready() = false (ancienne %d, nouvelle %d)", old.Offset(), next.Offset())
	}

	for _, ev := range log[80:100] {
		if err := m.Apply(ev); err != nil {
			t.Fatal(err)
		}
	}
	if err := m.Switch(); err != nil {
		t.Fatalf("Switch() : %v", err)
	}
	if m.Current() != View(next) {
		t.Error("après Switch, Current() doit renvoyer la nouvelle vue")
	}
	if err := m.Rollback(); err != nil || m.Current() != View(old) {
		t.Errorf("Rollback() = %v ; les lectures doivent revenir à l'ancienne vue", err)
	}
	if old.Offset() != 100 {
		t.Errorf("l'ancienne vue doit être à jour pour un retour arrière : offset %d, attendu 100", old.Offset())
	}
	if err := m.Switch(); err != nil {
		t.Fatal(err)
	}
	if err := m.Retire(); err != nil {
		t.Fatalf("Retire() après bascule : %v", err)
	}
	for _, ev := range log[100:] {
		if err := m.Apply(ev); err != nil {
			t.Fatal(err)
		}
	}
	if old.Offset() != 100 {
		t.Errorf("une vue retirée n'est plus maintenue : offset %d, attendu 100", old.Offset())
	}
	if err := m.Rollback(); !errors.Is(err, ErrRetired) {
		t.Errorf("Rollback() après Retire : err = %v, attendu ErrRetired", err)
	}
	if m.Current() != View(next) {
		t.Error("après Retire, les lectures restent sur la nouvelle vue")
	}
}

func TestM3NewViewMatchesRebuild(t *testing.T) {
	log := genLog(200)
	old := NewCounter(Field("city"))
	next := NewCounter(Field("country"))
	m := NewMigration(old, next)
	// L'ancienne vue tourne seule jusqu'à 120, en direct.
	for _, ev := range log[:120] {
		if err := old.Apply(ev); err != nil {
			t.Fatal(err)
		}
	}
	// Des événements en direct arrivent AVANT le rattrapage de la nouvelle vue.
	for _, ev := range log[120:150] {
		if err := m.Apply(ev); err != nil {
			t.Fatal(err)
		}
	}
	if next.Offset() != 0 {
		t.Errorf("une vue en retard ne doit pas recevoir d'événement en direct (offset %d) : elle sauterait des offsets que Backfill ignorerait ensuite", next.Offset())
	}
	if err := m.Backfill(log[:150]); err != nil {
		t.Fatal(err)
	}
	for _, ev := range log[150:] {
		if err := m.Apply(ev); err != nil {
			t.Fatal(err)
		}
	}
	want := NewCounter(Field("country"))
	if _, err := CatchUp(want, log); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(next.Counts(), want.Counts()) {
		t.Errorf("nouvelle vue %v ≠ reconstruction complète %v — elle a manqué ou doublé des événements", next.Counts(), want.Counts())
	}
	total := 0
	for _, n := range want.Counts() {
		total += n
	}
	oldTotal := 0
	for _, n := range old.Counts() {
		oldTotal += n
	}
	if total != oldTotal {
		t.Errorf("les deux vues comptent les mêmes documents : %d (pays) contre %d (villes)", total, oldTotal)
	}
	if err := m.Apply(put(0, "x", "Lyon", "FR")); !errors.Is(err, ErrBadOffset) {
		t.Errorf("Migration.Apply d'un événement invalide : err = %v, attendu ErrBadOffset", err)
	}
}
