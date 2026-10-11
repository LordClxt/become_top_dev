package lab

import (
	"errors"
	"reflect"
	"testing"
)

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("erreur inattendue : %v", err)
	}
}

func put(t *testing.T, tx *Tx, k, v string) {
	t.Helper()
	must(t, tx.Put(k, v))
}

func get(t *testing.T, tx *Tx, k string) string {
	t.Helper()
	v, ok, err := tx.Get(k)
	must(t, err)
	if !ok {
		return "<absent>"
	}
	return v
}

// seed écrit les couples donnés dans une transaction validée.
func seed(t *testing.T, s *Store, kv ...string) {
	t.Helper()
	tx := s.Begin()
	for i := 0; i < len(kv); i += 2 {
		put(t, tx, kv[i], kv[i+1])
	}
	must(t, tx.Commit())
}

// ---------- Jalon 1 : identifiants et versions ----------

func TestM1IncreasingIDs(t *testing.T) {
	s := NewStore()
	a, b, c := s.Begin(), s.Begin(), s.Begin()
	if a == nil || b == nil || c == nil {
		t.Fatal("Begin doit renvoyer une transaction")
	}
	if a.ID() != 1 || b.ID() != 2 || c.ID() != 3 {
		t.Errorf("identifiants = %d, %d, %d ; attendu 1, 2, 3 — strictement croissants", a.ID(), b.ID(), c.ID())
	}
	if s.Status(b.ID()) != InProgress {
		t.Errorf("une transaction qui vient de démarrer doit être InProgress")
	}
}

func TestM1VersionsCreatedDeleted(t *testing.T) {
	s := NewStore()
	seed(t, s, "a", "1")
	seed(t, s, "a", "2")
	tx := s.Begin()
	must(t, tx.Delete("a"))
	must(t, tx.Commit())
	want := []Version{{"1", 1, 2}, {"2", 2, 3}}
	if got := s.Versions("a"); !reflect.DeepEqual(got, want) {
		t.Errorf("Versions(a) = %v\nattendu %v — une mise à jour crée une version et marque l'ancienne DeletedBy au commit", got, want)
	}
}

func TestM1PendingAndAbort(t *testing.T) {
	s := NewStore()
	seed(t, s, "a", "1")
	tx := s.Begin()
	put(t, tx, "a", "x")
	put(t, tx, "a", "y")
	if got := s.Versions("a"); len(got) != 2 || got[1] != (Version{"y", 2, 0}) || got[0].DeletedBy != 0 {
		t.Errorf("avant commit : %v — une seule version en attente par clé et par transaction, et l'ancienne n'est pas encore marquée", got)
	}
	must(t, tx.Abort())
	if s.Status(tx.ID()) != Aborted {
		t.Error("après Abort, le statut doit être Aborted")
	}
	if got := s.Versions("a"); got[0].DeletedBy != 0 {
		t.Errorf("une transaction abandonnée ne doit rien marquer comme supprimé : %v", got)
	}
	if err := tx.Put("a", "z"); !errors.Is(err, ErrTxClosed) {
		t.Errorf("Put après Abort : err = %v, attendu ErrTxClosed", err)
	}
	if err := tx.Commit(); !errors.Is(err, ErrTxClosed) {
		t.Errorf("Commit après Abort : err = %v, attendu ErrTxClosed", err)
	}
}

func TestM1DeleteOwnPending(t *testing.T) {
	s := NewStore()
	tx := s.Begin()
	put(t, tx, "k", "v")
	must(t, tx.Delete("k"))
	if got := s.Versions("k"); len(got) != 0 {
		t.Errorf("écrire puis supprimer dans la même transaction ne doit laisser aucune version : %v", got)
	}
	must(t, tx.Commit())
	if s.Status(tx.ID()) != Committed {
		t.Error("après Commit, le statut doit être Committed")
	}
}

// ---------- Jalon 2 : règles de visibilité ----------

func TestM2OwnWritesAndCommitted(t *testing.T) {
	s := NewStore()
	seed(t, s, "x", "old")
	tx := s.Begin()
	if got := get(t, tx, "x"); got != "old" {
		t.Errorf("Get(x) = %q, attendu old — une version validée avant le début est visible", got)
	}
	put(t, tx, "x", "new")
	if got := get(t, tx, "x"); got != "new" {
		t.Errorf("Get(x) après Put = %q — une transaction lit ses propres écritures", got)
	}
	must(t, tx.Delete("x"))
	if got := get(t, tx, "x"); got != "<absent>" {
		t.Errorf("Get(x) après Delete = %q — sa propre suppression rend la clé absente", got)
	}
}

func TestM2NoDirtyRead(t *testing.T) {
	s := NewStore()
	seed(t, s, "x", "1")
	w := s.Begin()
	put(t, w, "x", "2")
	r := s.Begin()
	if got := get(t, r, "x"); got != "1" {
		t.Errorf("lecture sale ! Get(x) = %q alors que l'écrivain n'a pas validé", got)
	}
	must(t, w.Abort())
	if got := get(t, s.Begin(), "x"); got != "1" {
		t.Errorf("Get(x) = %q — les versions d'une transaction abandonnée sont ignorées", got)
	}
}

// L'exemple d'Alice : 500 € sur deux comptes, un virement de 100 € en cours.
func TestM2NoReadSkew(t *testing.T) {
	s := NewStore()
	seed(t, s, "acc1", "500", "acc2", "500")
	alice := s.Begin()
	if got := get(t, alice, "acc1"); got != "500" {
		t.Fatalf("acc1 = %q", got)
	}
	transfer := s.Begin()
	put(t, transfer, "acc1", "600")
	put(t, transfer, "acc2", "400")
	must(t, transfer.Commit())
	if got := get(t, alice, "acc2"); got != "500" {
		t.Errorf("read skew ! acc2 = %q, attendu 500 — le virement a validé APRÈS le début d'Alice", got)
	}
	if got := get(t, alice, "acc1"); got != "500" {
		t.Errorf("lecture non répétable : acc1 = %q, attendu 500", got)
	}
}

func TestM2InProgressAtStartStaysInvisible(t *testing.T) {
	s := NewStore()
	early := s.Begin() // id plus petit, encore en cours quand late démarre
	put(t, early, "k", "early")
	late := s.Begin()
	must(t, early.Commit())
	if got := get(t, late, "k"); got != "<absent>" {
		t.Errorf("Get(k) = %q — early était en cours au démarrage : invisible même après son commit", got)
	}
	if got := get(t, s.Begin(), "k"); got != "early" {
		t.Errorf("une transaction démarrée après le commit doit voir early, a %q", got)
	}
}

func TestM2LaterIDInvisible(t *testing.T) {
	s := NewStore()
	seed(t, s, "k", "v1")
	reader := s.Begin()
	later := s.Begin()
	put(t, later, "k", "v2")
	must(t, later.Delete("gone"))
	must(t, later.Commit())
	if got := get(t, reader, "k"); got != "v1" {
		t.Errorf("Get(k) = %q, attendu v1 — une transaction d'identifiant plus grand est invisible", got)
	}
}

func TestM2DeletionInvisibleToOlderSnapshot(t *testing.T) {
	s := NewStore()
	seed(t, s, "a", "1", "b", "2", "c", "3")
	backup := s.Begin()
	del := s.Begin()
	must(t, del.Delete("b"))
	put(t, del, "d", "4")
	must(t, del.Commit())
	got, err := backup.Scan()
	must(t, err)
	want := []KV{{"a", "1"}, {"b", "2"}, {"c", "3"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Scan = %v\nattendu %v — la sauvegarde voit l'instantané du début, triée par clé", got, want)
	}
	after, _ := s.Begin().Scan()
	if !reflect.DeepEqual(after, []KV{{"a", "1"}, {"c", "3"}, {"d", "4"}}) {
		t.Errorf("après le commit, Scan = %v", after)
	}
}

// ---------- Jalon 3 : premier qui valide gagne, et nettoyage ----------

// increment fait un cycle lire-modifier-écrire sur un compteur.
func increment(t *testing.T, tx *Tx) {
	t.Helper()
	n := map[string]string{"<absent>": "1", "0": "1", "1": "2", "2": "3", "3": "4"}[get(t, tx, "counter")]
	put(t, tx, "counter", n)
}

func TestM3LostUpdateDetected(t *testing.T) {
	s := NewStore()
	seed(t, s, "counter", "0")
	a, b := s.Begin(), s.Begin()
	increment(t, a)
	increment(t, b)
	must(t, a.Commit())
	if err := b.Commit(); !errors.Is(err, ErrWriteConflict) {
		t.Fatalf("b.Commit() = %v, attendu ErrWriteConflict — sinon l'incrément de a est perdu", err)
	}
	if s.Status(b.ID()) != Aborted {
		t.Error("une transaction refusée au commit doit être Aborted")
	}
	retry := s.Begin()
	increment(t, retry)
	must(t, retry.Commit())
	if got := get(t, s.Begin(), "counter"); got != "2" {
		t.Errorf("counter = %q après le nouvel essai, attendu 2", got)
	}
}

func TestM3ConflictCases(t *testing.T) {
	cases := []struct {
		name     string
		first    func(*Tx) error
		second   func(*Tx) error
		conflict bool
	}{
		{"mêmes clés", func(tx *Tx) error { return tx.Put("k", "a") }, func(tx *Tx) error { return tx.Put("k", "b") }, true},
		{"suppression puis écriture", func(tx *Tx) error { return tx.Delete("k") }, func(tx *Tx) error { return tx.Put("k", "b") }, true},
		{"deux insertions d'une nouvelle clé", func(tx *Tx) error { return tx.Put("new", "a") }, func(tx *Tx) error { return tx.Put("new", "b") }, true},
		{"clés disjointes", func(tx *Tx) error { return tx.Put("k", "a") }, func(tx *Tx) error { return tx.Put("other", "b") }, false},
	}
	for _, c := range cases {
		s := NewStore()
		seed(t, s, "k", "0")
		a, b := s.Begin(), s.Begin()
		must(t, c.first(a))
		must(t, c.second(b))
		must(t, a.Commit())
		err := b.Commit()
		if c.conflict && !errors.Is(err, ErrWriteConflict) {
			t.Errorf("%s : b.Commit() = %v, attendu ErrWriteConflict", c.name, err)
		}
		if !c.conflict && err != nil {
			t.Errorf("%s : b.Commit() = %v, attendu nil — pas de conflit sans clé commune", c.name, err)
		}
	}
}

func TestM3SequentialIsNotAConflict(t *testing.T) {
	s := NewStore()
	seed(t, s, "k", "0")
	seed(t, s, "k", "1")
	tx := s.Begin()
	put(t, tx, "k", "2")
	if err := tx.Commit(); err != nil {
		t.Errorf("Commit = %v — les écritures validées AVANT le début sont dans le snapshot : pas un conflit", err)
	}
	aborted := s.Begin()
	put(t, aborted, "k", "x")
	must(t, aborted.Abort())
	tx2 := s.Begin()
	put(t, tx2, "k", "3")
	if err := tx2.Commit(); err != nil {
		t.Errorf("Commit = %v — une transaction abandonnée ne crée pas de conflit", err)
	}
}

// Les médecins de garde : le snapshot isolation laisse passer le write skew.
func TestM3WriteSkewIsNotDetected(t *testing.T) {
	s := NewStore()
	seed(t, s, "alice", "on", "bob", "on")
	a, b := s.Begin(), s.Begin()
	if get(t, a, "bob") == "on" {
		put(t, a, "alice", "off")
	}
	if get(t, b, "alice") == "on" {
		put(t, b, "bob", "off")
	}
	if err := a.Commit(); err != nil {
		t.Fatal(err)
	}
	if err := b.Commit(); err != nil {
		t.Errorf("b.Commit() = %v — clés disjointes : first-committer-wins ne voit rien (c'est le write skew du chapitre suivant)", err)
	}
}

func TestM3Vacuum(t *testing.T) {
	s := NewStore()
	seed(t, s, "k", "v1")
	old := s.Begin() // voit encore v1
	seed(t, s, "k", "v2")
	ab := s.Begin()
	put(t, ab, "k", "junk")
	must(t, ab.Abort())
	if n := s.Vacuum(); n != 1 {
		t.Errorf("Vacuum = %d, attendu 1 — seule la version abandonnée part : old voit encore v1", n)
	}
	if got := get(t, old, "k"); got != "v1" {
		t.Errorf("après Vacuum, old lit %q, attendu v1", got)
	}
	must(t, old.Commit())
	if n := s.Vacuum(); n != 1 {
		t.Errorf("Vacuum = %d, attendu 1 — plus personne ne peut voir v1", n)
	}
	if got := s.Versions("k"); !reflect.DeepEqual(got, []Version{{"v2", 3, 0}}) {
		t.Errorf("Versions(k) = %v après nettoyage", got)
	}
}

// Une transaction démarrée pendant l'exécution du suppresseur ne le voit jamais : sa version doit rester.
func TestM3VacuumRespectsConcurrentSnapshot(t *testing.T) {
	s := NewStore()
	seed(t, s, "k", "v1")
	del := s.Begin()
	must(t, del.Delete("k"))
	watcher := s.Begin() // del est en cours : watcher ne verra jamais sa suppression
	must(t, del.Commit())
	if n := s.Vacuum(); n != 0 {
		t.Errorf("Vacuum = %d, attendu 0 — watcher a un identifiant plus grand que del mais ne le voit pas", n)
	}
	if got := get(t, watcher, "k"); got != "v1" {
		t.Errorf("watcher lit %q, attendu v1", got)
	}
}
