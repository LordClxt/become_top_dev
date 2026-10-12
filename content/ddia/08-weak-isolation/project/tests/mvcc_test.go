package lab

import (
	"errors"
	"testing"
)

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func get(t *testing.T, tx *Tx, key string) string {
	t.Helper()
	v, ok := tx.Get(key)
	if !ok {
		return "<absent>"
	}
	return v
}

// ---------- Jalon 1 ----------

func TestM1NoDirtyReads(t *testing.T) {
	db := NewDB()
	t1, t2 := db.Begin(ReadCommitted), db.Begin(ReadCommitted)
	must(t, t1.Put("x", "3"))
	if got := get(t, t1, "x"); got != "3" {
		t.Fatalf("une transaction doit voir ses propres écritures : %s", got)
	}
	if got := get(t, t2, "x"); got != "<absent>" {
		t.Fatalf("lecture sale : t2 voit %s alors que t1 n'a pas validé", got)
	}
	must(t, t1.Commit())
	if got := get(t, t2, "x"); got != "3" {
		t.Fatalf("après la validation, read committed doit voir 3 : %s", got)
	}
}

func TestM1OldValueStaysUntilCommit(t *testing.T) {
	db := NewDB()
	s := db.Begin(ReadCommitted)
	must(t, s.Put("x", "2"))
	must(t, s.Commit())
	t1, t2 := db.Begin(ReadCommitted), db.Begin(ReadCommitted)
	must(t, t1.Put("x", "3"))
	if got := get(t, t2, "x"); got != "2" {
		t.Fatalf("tant que t1 n'a pas validé, t2 lit l'ancienne valeur validée (2) : %s", got)
	}
	must(t, t1.Commit())
	if got := get(t, t2, "x"); got != "3" {
		t.Fatalf("puis la nouvelle : %s", got)
	}
}

func TestM1AbortRollsEverythingBack(t *testing.T) {
	db := NewDB()
	t1 := db.Begin(ReadCommitted)
	must(t, t1.Put("email", "bonjour"))
	must(t, t1.Put("unread", "1"))
	t1.Abort()
	t2 := db.Begin(ReadCommitted)
	if get(t, t2, "email") != "<absent>" || get(t, t2, "unread") != "<absent>" {
		t.Fatal("atomicité : après Abort, aucune des écritures ne doit subsister")
	}
	// la clé est libre
	t3 := db.Begin(ReadCommitted)
	must(t, t3.Put("email", "autre"))
}

func TestM1NoDirtyWrites(t *testing.T) {
	db := NewDB()
	alice, bob := db.Begin(ReadCommitted), db.Begin(ReadCommitted)
	must(t, alice.Put("listing", "Alice"))
	if err := bob.Put("listing", "Bob"); !errors.Is(err, ErrLocked) {
		t.Fatalf("écraser une écriture non validée : %v, attendu ErrLocked", err)
	}
	must(t, alice.Put("invoice", "Alice"))
	must(t, alice.Commit())
	bob.Abort()
	c := db.Begin(ReadCommitted)
	if get(t, c, "listing") != "Alice" || get(t, c, "invoice") != "Alice" {
		t.Fatal("la vente et la facture doivent aller à la même personne")
	}
	d := db.Begin(ReadCommitted)
	must(t, d.Put("listing", "Bob")) // une fois Alice terminée, la clé est libre
}

func TestM1DeleteAndFinished(t *testing.T) {
	db := NewDB()
	a := db.Begin(ReadCommitted)
	must(t, a.Put("k", "v"))
	must(t, a.Commit())
	b, c := db.Begin(ReadCommitted), db.Begin(ReadCommitted)
	must(t, b.Delete("k"))
	if get(t, c, "k") != "v" {
		t.Fatal("la suppression n'est visible qu'après la validation")
	}
	if get(t, b, "k") != "<absent>" {
		t.Fatal("la transaction qui supprime ne voit plus la clé")
	}
	must(t, b.Commit())
	if get(t, c, "k") != "<absent>" {
		t.Fatal("après validation, la clé est supprimée")
	}
	if err := b.Put("x", "y"); !errors.Is(err, ErrFinished) {
		t.Fatalf("écrire après Commit : %v, attendu ErrFinished", err)
	}
	if err := b.Commit(); !errors.Is(err, ErrFinished) {
		t.Fatalf("Commit deux fois : %v", err)
	}
}

func TestM1UpdateTwiceInTheSameTransaction(t *testing.T) {
	db := NewDB()
	a := db.Begin(ReadCommitted)
	must(t, a.Put("k", "1"))
	must(t, a.Put("k", "2"))
	if get(t, a, "k") != "2" {
		t.Fatal("la dernière écriture de la transaction doit l'emporter")
	}
	must(t, a.Commit())
	if get(t, db.Begin(ReadCommitted), "k") != "2" {
		t.Fatal("2 attendu après validation")
	}
}

// ---------- Jalon 2 ----------

func seedAccounts(t *testing.T, db *DB) {
	s := db.Begin(ReadCommitted)
	must(t, s.Put("a", "500"))
	must(t, s.Put("b", "500"))
	must(t, s.Commit())
}

func TestM2ReadSkewUnderReadCommittedButNotUnderSnapshot(t *testing.T) {
	for _, level := range []Isolation{ReadCommitted, SnapshotIsolation} {
		db := NewDB()
		seedAccounts(t, db)
		alice := db.Begin(level)
		a := get(t, alice, "a")
		transfer := db.Begin(ReadCommitted)
		must(t, transfer.Put("a", "400"))
		must(t, transfer.Put("b", "600"))
		must(t, transfer.Commit())
		b := get(t, alice, "b")
		if level == ReadCommitted && !(a == "500" && b == "600") {
			t.Errorf("read committed : a=%s b=%s ; attendu 500 et 600 (lecture non répétable)", a, b)
		}
		if level == SnapshotIsolation && !(a == "500" && b == "500") {
			t.Errorf("snapshot : a=%s b=%s ; attendu 500 et 500 (instantané cohérent)", a, b)
		}
	}
}

func TestM2SnapshotIgnoresTransactionsInProgressAtStart(t *testing.T) {
	db := NewDB()
	t1 := db.Begin(ReadCommitted)
	must(t, t1.Put("x", "1"))
	t2 := db.Begin(SnapshotIsolation) // t1 est en cours à ce moment
	must(t, t1.Commit())
	if got := get(t, t2, "x"); got != "<absent>" {
		t.Fatalf("t1 était en cours au début de t2 : ses écritures restent invisibles pour t2 même après validation (lu %s)", got)
	}
	if got := get(t, db.Begin(SnapshotIsolation), "x"); got != "1" {
		t.Fatalf("une nouvelle transaction voit x = 1 : %s", got)
	}
}

func TestM2SnapshotIgnoresLaterTransactions(t *testing.T) {
	db := NewDB()
	t1 := db.Begin(SnapshotIsolation)
	t2 := db.Begin(ReadCommitted)
	must(t, t2.Put("y", "late"))
	must(t, t2.Commit())
	if got := get(t, t1, "y"); got != "<absent>" {
		t.Fatalf("t2 a démarré après t1 : invisible pour t1 (lu %s)", got)
	}
}

func TestM2LongReaderKeepsSeeingTheOldVersion(t *testing.T) {
	db := NewDB()
	s := db.Begin(ReadCommitted)
	must(t, s.Put("k", "v0"))
	must(t, s.Commit())
	reader := db.Begin(SnapshotIsolation)
	for i := 1; i <= 5; i++ {
		w := db.Begin(ReadCommitted)
		must(t, w.Put("k", "v"+string(rune('0'+i))))
		must(t, w.Commit())
	}
	if got := get(t, reader, "k"); got != "v0" {
		t.Fatalf("le lecteur long garde son instantané : v0 attendu, lu %s", got)
	}
	if got := get(t, db.Begin(ReadCommitted), "k"); got != "v5" {
		t.Fatalf("une transaction neuve lit la dernière valeur : %s", got)
	}
}

func TestM2AbortedWritesAreInvisible(t *testing.T) {
	db := NewDB()
	a := db.Begin(ReadCommitted)
	must(t, a.Put("k", "ghost"))
	a.Abort()
	if got := get(t, db.Begin(SnapshotIsolation), "k"); got != "<absent>" {
		t.Fatalf("écriture annulée visible : %s", got)
	}
}

func TestM2Vacuum(t *testing.T) {
	db := NewDB()
	s := db.Begin(ReadCommitted)
	must(t, s.Put("x", "v1"))
	must(t, s.Commit())
	reader := db.Begin(SnapshotIsolation)
	w := db.Begin(ReadCommitted)
	must(t, w.Put("x", "v2"))
	must(t, w.Commit())
	if n := db.Vacuum(); n != 0 {
		t.Fatalf("Vacuum a supprimé %d version(s) alors que le lecteur de l'instantané voit encore v1", n)
	}
	if get(t, reader, "x") != "v1" {
		t.Fatal("le lecteur doit toujours voir v1")
	}
	must(t, reader.Commit())
	if n := db.Vacuum(); n != 1 {
		t.Fatalf("une fois le lecteur terminé, v1 est inutile : %d supprimée(s), attendu 1", n)
	}
	if get(t, db.Begin(ReadCommitted), "x") != "v2" {
		t.Fatal("v2 doit rester")
	}
	ab := db.Begin(ReadCommitted)
	must(t, ab.Put("y", "ghost"))
	ab.Abort()
	if n := db.Vacuum(); n != 1 {
		t.Fatalf("la version créée par une transaction annulée est à supprimer : %d", n)
	}
}

// ---------- Jalon 3 ----------

func seedCounter(t *testing.T, db *DB) {
	s := db.Begin(ReadCommitted)
	must(t, s.Put("counter", "42"))
	must(t, s.Commit())
}

func TestM3ReadCommittedLosesUpdates(t *testing.T) {
	db := NewDB()
	seedCounter(t, db)
	a, b := db.Begin(ReadCommitted), db.Begin(ReadCommitted)
	if get(t, a, "counter") != "42" || get(t, b, "counter") != "42" {
		t.Fatal("les deux lisent 42")
	}
	must(t, a.Put("counter", "43"))
	must(t, a.Commit())
	must(t, b.Put("counter", "43")) // read committed ne détecte rien : la mise à jour de a est perdue
	must(t, b.Commit())
	if got := get(t, db.Begin(ReadCommitted), "counter"); got != "43" {
		t.Fatalf("compteur = %s ; read committed doit laisser perdre une mise à jour (43)", got)
	}
}

func TestM3SnapshotDetectsLostUpdate(t *testing.T) {
	db := NewDB()
	seedCounter(t, db)
	a, b := db.Begin(SnapshotIsolation), db.Begin(SnapshotIsolation)
	get(t, a, "counter")
	get(t, b, "counter")
	must(t, a.Put("counter", "43"))
	must(t, a.Commit())
	if err := b.Put("counter", "43"); !errors.Is(err, ErrConflict) {
		t.Fatalf("b écrit une clé qu'un concurrent a validée depuis son instantané : %v, attendu ErrConflict", err)
	}
	b.Abort()
	retry := db.Begin(SnapshotIsolation) // on recommence la boucle lecture-modification-écriture
	if get(t, retry, "counter") != "43" {
		t.Fatal("la reprise voit 43")
	}
	must(t, retry.Put("counter", "44"))
	must(t, retry.Commit())
	if got := get(t, db.Begin(ReadCommitted), "counter"); got != "44" {
		t.Fatalf("aucune mise à jour perdue : %s, attendu 44", got)
	}
}

func TestM3SnapshotConflictOnDelete(t *testing.T) {
	db := NewDB()
	seedCounter(t, db)
	a, b := db.Begin(SnapshotIsolation), db.Begin(SnapshotIsolation)
	must(t, a.Delete("counter"))
	must(t, a.Commit())
	if err := b.Put("counter", "1"); !errors.Is(err, ErrConflict) {
		t.Fatalf("écrire sur une clé supprimée par un concurrent validé : %v, attendu ErrConflict", err)
	}
}

func onCall(t *testing.T, tx *Tx) int {
	n := 0
	for _, d := range []string{"alice", "bob"} {
		if v, _ := tx.Get(d); v == "on" {
			n++
		}
	}
	return n
}

func seedDoctors(t *testing.T, db *DB) {
	s := db.Begin(ReadCommitted)
	must(t, s.Put("alice", "on"))
	must(t, s.Put("bob", "on"))
	must(t, s.Commit())
}

func TestM3WriteSkewSlipsThroughSnapshotIsolation(t *testing.T) {
	db := NewDB()
	seedDoctors(t, db)
	alice, bob := db.Begin(SnapshotIsolation), db.Begin(SnapshotIsolation)
	if onCall(t, alice) != 2 || onCall(t, bob) != 2 {
		t.Fatal("chacun voit deux médecins de garde")
	}
	must(t, alice.Put("alice", "off")) // clés différentes : aucun conflit détecté
	must(t, bob.Put("bob", "off"))
	must(t, alice.Commit())
	must(t, bob.Commit())
	if n := onCall(t, db.Begin(SnapshotIsolation)); n != 0 {
		t.Fatalf("médecins de garde = %d ; l'isolation par instantané laisse passer ce write skew (0 attendu)", n)
	}
}

func TestM3ExplicitLockPreventsWriteSkew(t *testing.T) {
	db := NewDB()
	seedDoctors(t, db)
	alice, bob := db.Begin(SnapshotIsolation), db.Begin(SnapshotIsolation)
	must(t, alice.Lock("alice", "bob"))
	if err := bob.Lock("alice", "bob"); !errors.Is(err, ErrLocked) {
		t.Fatalf("Lock sur des clés déjà verrouillées : %v, attendu ErrLocked", err)
	}
	if err := bob.Put("bob", "off"); !errors.Is(err, ErrLocked) {
		t.Fatalf("écrire une clé verrouillée par une autre transaction : %v", err)
	}
	if onCall(t, alice) != 2 {
		t.Fatal("alice voit deux médecins")
	}
	must(t, alice.Put("alice", "off"))
	must(t, alice.Commit())
	bob.Abort()
	// bob réessaie : cette fois, il voit la vérité
	retry := db.Begin(SnapshotIsolation)
	must(t, retry.Lock("alice", "bob"))
	if n := onCall(t, retry); n != 1 {
		t.Fatalf("au second essai, bob voit %d médecin de garde (1 attendu) et doit refuser de partir", n)
	}
	retry.Abort()
}

func TestM3LockReleasedOnCommitAndAbort(t *testing.T) {
	db := NewDB()
	a, b := db.Begin(ReadCommitted), db.Begin(ReadCommitted)
	must(t, a.Lock("k"))
	a.Abort()
	must(t, b.Lock("k"))
	must(t, b.Commit())
	c := db.Begin(ReadCommitted)
	must(t, c.Lock("k"))
	if err := a.Lock("k"); !errors.Is(err, ErrFinished) {
		t.Fatalf("Lock sur une transaction terminée : %v", err)
	}
}

func TestM3CompareAndSet(t *testing.T) {
	db := NewDB()
	seedCounter(t, db)
	if !db.CompareAndSet("counter", "42", "43") {
		t.Fatal("la valeur validée est 42 : CompareAndSet doit réussir")
	}
	if db.CompareAndSet("counter", "42", "44") {
		t.Fatal("la valeur n'est plus 42 : CompareAndSet doit échouer (c'est l'idée : éviter la mise à jour perdue)")
	}
	if db.CompareAndSet("absent", "", "x") {
		t.Fatal("une clé absente ne correspond à aucune valeur attendue")
	}
	if got := get(t, db.Begin(ReadCommitted), "counter"); got != "43" {
		t.Fatalf("compteur = %s, attendu 43", got)
	}
}
