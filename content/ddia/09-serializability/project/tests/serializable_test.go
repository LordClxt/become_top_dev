package lab

import (
	"errors"
	"fmt"
	"reflect"
	"sync"
	"testing"
)

// ---------- Jalon 1 ----------

func TestM1ProceduresNeverInterleave(t *testing.T) {
	e := NewExecutor()
	defer e.Close()
	var wg sync.WaitGroup
	for g := 0; g < 50; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				// cycle lire-modifier-écrire : sûr puisque la procédure s'exécute seule
				e.Exec(func(s *Store) error {
					s.Set("counter", s.Get("counter")+1)
					return nil
				})
			}
		}()
	}
	wg.Wait()
	var got int
	e.Exec(func(s *Store) error { got = s.Get("counter"); return nil })
	if got != 5000 {
		t.Fatalf("compteur = %d, attendu 5000 : aucune mise à jour ne doit être perdue", got)
	}
}

func TestM1FailedProcedureIsRolledBack(t *testing.T) {
	e := NewExecutor()
	defer e.Close()
	e.Exec(func(s *Store) error { s.Set("a", 10); return nil })
	boom := errors.New("boom")
	err := e.Exec(func(s *Store) error {
		s.Set("a", 99)
		s.Set("b", 1)
		return boom
	})
	if !errors.Is(err, boom) {
		t.Fatalf("Exec doit renvoyer l'erreur de la procédure : %v", err)
	}
	var a, b int
	e.Exec(func(s *Store) error { a, b = s.Get("a"), s.Get("b"); return nil })
	if a != 10 || b != 0 {
		t.Fatalf("a=%d b=%d ; attendu 10 et 0 : les écritures d'une procédure en échec sont annulées", a, b)
	}
}

func TestM1WriteSkewIsImpossibleInSerialExecution(t *testing.T) {
	errLast := errors.New("dernier médecin de garde")
	goOff := func(name string) func(s *Store) error {
		return func(s *Store) error {
			if s.Get("alice")+s.Get("bob") < 2 {
				return errLast
			}
			s.Set(name, 0)
			return nil
		}
	}
	for round := 0; round < 200; round++ {
		e := NewExecutor()
		e.Exec(func(s *Store) error { s.Set("alice", 1); s.Set("bob", 1); return nil })
		var wg sync.WaitGroup
		var refused int
		var mu sync.Mutex
		for _, n := range []string{"alice", "bob"} {
			wg.Add(1)
			go func(n string) {
				defer wg.Done()
				if err := e.Exec(goOff(n)); errors.Is(err, errLast) {
					mu.Lock()
					refused++
					mu.Unlock()
				}
			}(n)
		}
		wg.Wait()
		var left int
		e.Exec(func(s *Store) error { left = s.Get("alice") + s.Get("bob"); return nil })
		e.Close()
		if left != 1 || refused != 1 {
			t.Fatalf("tour %d : %d médecin(s) de garde, %d refus ; attendu 1 et 1", round, left, refused)
		}
	}
}

func TestM1ClosedExecutor(t *testing.T) {
	e := NewExecutor()
	e.Close()
	if err := e.Exec(func(s *Store) error { return nil }); !errors.Is(err, ErrClosed) {
		t.Fatalf("Exec après Close : %v, attendu ErrClosed", err)
	}
	e.Close() // idempotent
}

func TestM1PartitionedExecutor(t *testing.T) {
	p := NewPartitionedExecutor(4)
	defer p.Close()
	for i := 0; i < 100; i++ {
		k := fmt.Sprintf("k%d", i)
		if a, b := p.PartitionOf(k), p.PartitionOf(k); a != b || a < 0 || a >= 4 {
			t.Fatalf("PartitionOf(%q) instable ou hors limites : %d, %d", k, a, b)
		}
	}
	var wg sync.WaitGroup
	for g := 0; g < 8; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 50; i++ {
				key := fmt.Sprintf("counter-%d", i%10)
				p.Exec(key, func(s *Store) error { s.Set(key, s.Get(key)+1); return nil })
			}
		}()
	}
	wg.Wait()
	total := 0
	for i := 0; i < 10; i++ {
		key := fmt.Sprintf("counter-%d", i)
		p.Exec(key, func(s *Store) error { total += s.Get(key); return nil })
	}
	if total != 400 {
		t.Fatalf("somme des compteurs = %d, attendu 400 (8 goroutines × 50)", total)
	}
	seen := map[int]bool{}
	for i := 0; i < 100; i++ {
		seen[p.PartitionOf(fmt.Sprintf("counter-%d", i))] = true
	}
	if len(seen) < 3 {
		t.Fatalf("les clés ne se répartissent que sur %d partitions", len(seen))
	}
}

// ---------- Jalon 2 ----------

func TestM2SharedLocksCoexist(t *testing.T) {
	lm := NewLockManager()
	if lm.Acquire(1, "x", Shared) != Granted || lm.Acquire(2, "x", Shared) != Granted {
		t.Fatal("plusieurs lecteurs peuvent détenir un verrou partagé")
	}
	if m, ok := lm.Holds(1, "x"); !ok || m != Shared {
		t.Fatalf("Holds = %v %v", m, ok)
	}
	if lm.Acquire(1, "x", Shared) != Granted {
		t.Fatal("redemander un verrou déjà détenu est accordé")
	}
}

func TestM2WritersBlockReadersAndViceVersa(t *testing.T) {
	lm := NewLockManager()
	lm.Acquire(1, "x", Exclusive)
	if lm.Acquire(2, "x", Shared) != Waiting {
		t.Fatal("un lecteur doit attendre un écrivain (contrairement à l'isolation par instantané)")
	}
	lm2 := NewLockManager()
	lm2.Acquire(1, "x", Shared)
	if lm2.Acquire(2, "x", Exclusive) != Waiting {
		t.Fatal("un écrivain doit attendre les lecteurs")
	}
	lm3 := NewLockManager()
	lm3.Acquire(1, "x", Exclusive)
	if lm3.Acquire(2, "x", Exclusive) != Waiting {
		t.Fatal("deux écrivains s'excluent")
	}
}

func TestM2UpgradeWhenSoleHolder(t *testing.T) {
	lm := NewLockManager()
	lm.Acquire(1, "x", Shared)
	if lm.Acquire(1, "x", Exclusive) != Granted {
		t.Fatal("seul détenteur : la promotion partagé → exclusif est accordée")
	}
	if m, _ := lm.Holds(1, "x"); m != Exclusive {
		t.Fatal("le verrou est maintenant exclusif")
	}
	if lm.Acquire(1, "x", Shared) != Granted {
		t.Fatal("un verrou exclusif couvre aussi la lecture")
	}
	lm2 := NewLockManager()
	lm2.Acquire(1, "x", Shared)
	lm2.Acquire(2, "x", Shared)
	if lm2.Acquire(1, "x", Exclusive) != Waiting {
		t.Fatal("promotion impossible tant qu'un autre lecteur détient le verrou")
	}
}

func TestM2ReleaseAllGrantsWaitersInOrder(t *testing.T) {
	lm := NewLockManager()
	lm.Acquire(1, "x", Exclusive)
	lm.Acquire(2, "x", Shared)
	lm.Acquire(3, "x", Shared)
	lm.Acquire(4, "x", Exclusive)
	got := lm.ReleaseAll(1)
	if !reflect.DeepEqual(got, []int{2, 3}) {
		t.Fatalf("ReleaseAll(1) a débloqué %v, attendu [2 3] : les deux lecteurs ensemble, l'écrivain 4 attend encore", got)
	}
	if _, ok := lm.Holds(1, "x"); ok {
		t.Fatal("1 ne détient plus rien")
	}
	if m, ok := lm.Holds(2, "x"); !ok || m != Shared {
		t.Fatal("2 détient maintenant un verrou partagé")
	}
	lm.ReleaseAll(2)
	if got := lm.ReleaseAll(3); !reflect.DeepEqual(got, []int{4}) {
		t.Fatalf("après 2 et 3, l'écrivain 4 est débloqué : %v", got)
	}
}

func TestM2NoStarvationOfWriters(t *testing.T) {
	lm := NewLockManager()
	lm.Acquire(1, "x", Shared)
	lm.Acquire(2, "x", Exclusive) // attend
	if lm.Acquire(3, "x", Shared) != Waiting {
		t.Fatal("un nouveau lecteur ne doit pas doubler un écrivain déjà en attente")
	}
}

func TestM2DetectsDeadlock(t *testing.T) {
	lm := NewLockManager()
	lm.Acquire(1, "a", Exclusive)
	lm.Acquire(2, "b", Exclusive)
	if lm.Acquire(1, "b", Exclusive) != Waiting {
		t.Fatal("1 attend 2")
	}
	if got := lm.Acquire(2, "a", Exclusive); got != Deadlock {
		t.Fatalf("2 attendrait 1 qui attend 2 : %v, attendu Deadlock", got)
	}
	// la demande de 2 a été retirée : en relâchant 2, on débloque 1
	if got := lm.ReleaseAll(2); !reflect.DeepEqual(got, []int{1}) {
		t.Fatalf("après l'annulation de 2, 1 obtient b : %v", got)
	}
}

func TestM2DetectsLongerCycleAndUpgradeDeadlock(t *testing.T) {
	lm := NewLockManager()
	lm.Acquire(1, "a", Exclusive)
	lm.Acquire(2, "b", Exclusive)
	lm.Acquire(3, "c", Exclusive)
	lm.Acquire(1, "b", Shared) // 1 attend 2
	lm.Acquire(2, "c", Shared) // 2 attend 3
	if got := lm.Acquire(3, "a", Shared); got != Deadlock {
		t.Fatalf("cycle 1→2→3→1 : %v", got)
	}
	up := NewLockManager()
	up.Acquire(1, "x", Shared)
	up.Acquire(2, "x", Shared)
	if up.Acquire(1, "x", Exclusive) != Waiting {
		t.Fatal("1 veut promouvoir et attend 2")
	}
	if up.Acquire(2, "x", Exclusive) != Deadlock {
		t.Fatal("deux promotions simultanées s'attendent mutuellement : interblocage")
	}
}

func TestM2ReaderWriterScenarioIsSerializable(t *testing.T) {
	// docteurs de garde sous 2PL : chacun lit alice et bob (partagé) puis veut écrire (exclusif)
	lm := NewLockManager()
	lm.Acquire(1, "alice", Shared)
	lm.Acquire(1, "bob", Shared)
	lm.Acquire(2, "alice", Shared)
	lm.Acquire(2, "bob", Shared)
	if lm.Acquire(1, "alice", Exclusive) != Waiting {
		t.Fatal("1 attend que 2 relâche son verrou partagé")
	}
	if lm.Acquire(2, "bob", Exclusive) != Deadlock {
		t.Fatal("2 attendrait 1 : interblocage, 2 est annulé — 2PL empêche le write skew")
	}
}

// ---------- Jalon 3 ----------

func seed(t *testing.T, db *OptimisticDB, kvs map[string]string) {
	tx := db.Begin()
	for k, v := range kvs {
		tx.Put(k, v)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
}

func TestM3ReadsSnapshotAndOwnWrites(t *testing.T) {
	db := NewOptimisticDB()
	seed(t, db, map[string]string{"a": "1"})
	t1 := db.Begin()
	t2 := db.Begin()
	t2.Put("a", "2")
	if v, _ := t2.Get("a"); v != "2" {
		t.Fatal("une transaction voit ses propres écritures")
	}
	if err := t2.Commit(); err != nil {
		t.Fatal(err)
	}
	if v, _ := t1.Get("a"); v != "1" {
		t.Fatalf("t1 garde son instantané : %q", v)
	}
	t3 := db.Begin()
	if v, ok := t3.Get("a"); !ok || v != "2" {
		t.Fatalf("une transaction neuve voit la nouvelle valeur : %q", v)
	}
	t3.Delete("a")
	if _, ok := t3.Get("a"); ok {
		t.Fatal("après Delete, la clé n'existe plus pour la transaction")
	}
}

func TestM3WriteSkewIsPrevented(t *testing.T) {
	db := NewOptimisticDB()
	seed(t, db, map[string]string{"alice": "on", "bob": "on"})
	alice, bob := db.Begin(), db.Begin()
	count := func(tx *OTx) int {
		n := 0
		for _, d := range []string{"alice", "bob"} {
			if v, _ := tx.Get(d); v == "on" {
				n++
			}
		}
		return n
	}
	if count(alice) != 2 || count(bob) != 2 {
		t.Fatal("chacun voit deux médecins de garde")
	}
	alice.Put("alice", "off")
	bob.Put("bob", "off")
	if err := alice.Commit(); err != nil {
		t.Fatalf("la première validation réussit : %v", err)
	}
	if err := bob.Commit(); !errors.Is(err, ErrSerialization) {
		t.Fatalf("bob s'appuyait sur « alice est de garde » : %v, attendu ErrSerialization", err)
	}
	retry := db.Begin()
	n := 0
	for _, d := range []string{"alice", "bob"} {
		if v, _ := retry.Get(d); v == "on" {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("après l'échec de bob il reste %d médecin de garde (1 attendu)", n)
	}
}

func TestM3PhantomIsPrevented(t *testing.T) {
	db := NewOptimisticDB()
	seed(t, db, map[string]string{"booking:room1:09": "x"})
	u1, u2 := db.Begin(), db.Begin()
	for _, u := range []*OTx{u1, u2} {
		keys, _ := u.Scan("booking:room1:12")
		if len(keys) != 0 {
			t.Fatal("aucune réservation à midi")
		}
	}
	u1.Put("booking:room1:12", "u1")
	u2.Put("booking:room1:12-30", "u2") // clé différente, mais même créneau pour la recherche par préfixe
	if err := u1.Commit(); err != nil {
		t.Fatal(err)
	}
	if err := u2.Commit(); !errors.Is(err, ErrSerialization) {
		t.Fatalf("u2 avait cherché les réservations de midi : %v, attendu ErrSerialization (fantôme)", err)
	}
}

func TestM3ScanSeesSnapshotAndOwnWritesSorted(t *testing.T) {
	db := NewOptimisticDB()
	seed(t, db, map[string]string{"p:b": "B", "p:a": "A", "q:z": "Z"})
	tx := db.Begin()
	tx.Put("p:c", "C")
	tx.Delete("p:a")
	keys, vals := tx.Scan("p:")
	if !reflect.DeepEqual(keys, []string{"p:b", "p:c"}) || !reflect.DeepEqual(vals, []string{"B", "C"}) {
		t.Fatalf("Scan = %v %v ; attendu [p:b p:c] [B C] (trié, avec ses propres écritures)", keys, vals)
	}
}

func TestM3ReadOnlyNeverAborts(t *testing.T) {
	db := NewOptimisticDB()
	seed(t, db, map[string]string{"a": "1"})
	ro := db.Begin()
	ro.Get("a")
	ro.Scan("")
	w := db.Begin()
	w.Put("a", "2")
	w.Put("b", "3")
	if err := w.Commit(); err != nil {
		t.Fatal(err)
	}
	if err := ro.Commit(); err != nil {
		t.Fatalf("une transaction en lecture seule ne doit jamais être annulée : %v", err)
	}
}

func TestM3DisjointTransactionsBothCommit(t *testing.T) {
	db := NewOptimisticDB()
	seed(t, db, map[string]string{"a": "1", "b": "1"})
	t1, t2 := db.Begin(), db.Begin()
	t1.Get("a")
	t1.Put("a", "2")
	t2.Get("b")
	t2.Put("b", "2")
	if err := t1.Commit(); err != nil {
		t.Fatal(err)
	}
	if err := t2.Commit(); err != nil {
		t.Fatalf("t2 n'a rien lu de ce que t1 a écrit : %v", err)
	}
}

func TestM3AbortedTransactionLeavesNoTrace(t *testing.T) {
	db := NewOptimisticDB()
	tx := db.Begin()
	tx.Put("ghost", "x")
	tx.Abort()
	if err := tx.Commit(); err == nil {
		t.Fatal("Commit après Abort doit échouer")
	}
	if _, ok := db.Begin().Get("ghost"); ok {
		t.Fatal("une transaction annulée n'écrit rien")
	}
}
