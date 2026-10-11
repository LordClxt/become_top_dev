package lab

import (
	"errors"
	"reflect"
	"strconv"
	"strings"
	"testing"
)

// step décrit une demande de verrou et ce que le gestionnaire doit répondre.
type step struct {
	tx      TxID
	key     string
	mode    Mode
	granted bool
	err     error
}

func run(t *testing.T, lm *LockManager, steps []step) {
	t.Helper()
	for i, s := range steps {
		got, err := lm.Acquire(s.tx, s.key, s.mode)
		if got != s.granted || !errors.Is(err, s.err) {
			t.Fatalf("pas %d : Acquire(T%d, %q, %v) = %v, %v ; attendu %v, %v", i+1, s.tx, s.key, s.mode, got, err, s.granted, s.err)
		}
	}
}

// ---------- Jalon 1 : verrous partagés et exclusifs ----------

func TestM1Compatibility(t *testing.T) {
	cases := []struct {
		name  string
		steps []step
	}{
		{"deux lecteurs partagent", []step{{1, "a", Shared, true, nil}, {2, "a", Shared, true, nil}}},
		{"un lecteur bloque un écrivain", []step{{1, "a", Shared, true, nil}, {2, "a", Exclusive, false, nil}}},
		{"un écrivain bloque un lecteur", []step{{1, "a", Exclusive, true, nil}, {2, "a", Shared, false, nil}}},
		{"un écrivain bloque un écrivain", []step{{1, "a", Exclusive, true, nil}, {2, "a", Exclusive, false, nil}}},
		{"des clés différentes ne se gênent pas", []step{{1, "a", Exclusive, true, nil}, {2, "b", Exclusive, true, nil}}},
		{"redemander un verrou détenu est accordé", []step{{1, "a", Exclusive, true, nil}, {1, "a", Shared, true, nil}, {1, "a", Exclusive, true, nil}}},
		{"mode invalide", []step{{1, "a", Mode(7), false, ErrBadMode}}},
		{"une transaction en attente ne peut rien demander", []step{{1, "a", Exclusive, true, nil}, {2, "a", Shared, false, nil}, {2, "b", Shared, false, ErrBlocked}}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) { run(t, NewLockManager(), c.steps) })
	}
}

func TestM1Upgrade(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{{1, "a", Shared, true, nil}, {1, "a", Exclusive, true, nil}})
	if got := lm.Holders("a"); !reflect.DeepEqual(got, map[TxID]Mode{1: Exclusive}) {
		t.Errorf("après montée de verrou, Holders = %v, attendu T1 en exclusif seul", got)
	}
	lm = NewLockManager()
	run(t, lm, []step{{1, "a", Shared, true, nil}, {2, "a", Shared, true, nil}, {1, "a", Exclusive, false, nil}})
	if got := lm.Holders("a"); got[1] != Shared {
		t.Errorf("une montée en attente ne doit pas changer le verrou détenu : Holders = %v", got)
	}
}

func TestM1ReleaseGrantsInOrder(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{
		{1, "a", Exclusive, true, nil},
		{2, "a", Shared, false, nil},
		{3, "a", Shared, false, nil},
		{4, "a", Exclusive, false, nil},
		{5, "a", Shared, false, nil},
	})
	if got := lm.ReleaseAll(1); !reflect.DeepEqual(got, []TxID{2, 3}) {
		t.Fatalf("ReleaseAll(T1) débloque %v, attendu [2 3] — accorde la tête de file tant qu'elle est compatible, puis arrête-toi", got)
	}
	if got := lm.Holders("a"); !reflect.DeepEqual(got, map[TxID]Mode{2: Shared, 3: Shared}) {
		t.Errorf("Holders = %v, attendu T2 et T3 en partagé", got)
	}
	if got := lm.ReleaseAll(2); len(got) != 0 {
		t.Errorf("T3 lit encore : T4 doit attendre, débloqués = %v", got)
	}
	if got := lm.ReleaseAll(3); !reflect.DeepEqual(got, []TxID{4}) {
		t.Errorf("ReleaseAll(T3) débloque %v, attendu [4]", got)
	}
	if got := lm.ReleaseAll(4); !reflect.DeepEqual(got, []TxID{5}) {
		t.Errorf("ReleaseAll(T4) débloque %v, attendu [5]", got)
	}
}

func TestM1NoOvertaking(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{
		{1, "a", Shared, true, nil},
		{2, "a", Exclusive, false, nil},
		{3, "a", Shared, false, nil}, // compatible avec T1, mais ne double pas l'écrivain qui attend
	})
	lm.ReleaseAll(1)
	if got := lm.Holders("a"); !reflect.DeepEqual(got, map[TxID]Mode{2: Exclusive}) {
		t.Errorf("Holders = %v, attendu T2 en exclusif : la file est servie dans l'ordre", got)
	}
}

func TestM1ReleaseAllKeys(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{
		{1, "b", Exclusive, true, nil},
		{1, "a", Exclusive, true, nil},
		{3, "b", Shared, false, nil},
		{2, "a", Shared, false, nil},
	})
	if got := lm.ReleaseAll(1); !reflect.DeepEqual(got, []TxID{2, 3}) {
		t.Errorf("ReleaseAll = %v, attendu [2 3] — relâche toutes les clés, traitées par ordre alphabétique", got)
	}
}

// ---------- Jalon 2 : le graphe d'attente et les interblocages ----------

func TestM2WaitsFor(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{
		{1, "a", Shared, true, nil},
		{2, "a", Shared, true, nil},
		{3, "a", Exclusive, false, nil},
		{4, "a", Shared, false, nil},
	})
	if got := lm.WaitsFor(3); !reflect.DeepEqual(got, []TxID{1, 2}) {
		t.Errorf("WaitsFor(T3) = %v, attendu [1 2] : un exclusif attend tous les détenteurs", got)
	}
	if got := lm.WaitsFor(4); !reflect.DeepEqual(got, []TxID{3}) {
		t.Errorf("WaitsFor(T4) = %v, attendu [3] : compatible avec les lecteurs, T4 attend l'écrivain placé devant elle", got)
	}
	if got := lm.WaitsFor(1); len(got) != 0 {
		t.Errorf("WaitsFor(T1) = %v : une transaction qui n'attend pas n'attend personne", got)
	}
}

func TestM2Deadlock(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{
		{1, "alice", Exclusive, true, nil},
		{2, "bob", Exclusive, true, nil},
		{1, "bob", Exclusive, false, nil},
		{2, "alice", Exclusive, false, ErrDeadlock},
	})
	if got := lm.WaitsFor(2); len(got) != 0 {
		t.Errorf("la victime ne doit pas rester dans la file : WaitsFor(T2) = %v", got)
	}
	if got := lm.ReleaseAll(2); !reflect.DeepEqual(got, []TxID{1}) {
		t.Errorf("abandonner la victime doit débloquer T1, débloqués = %v", got)
	}
}

func TestM2UpgradeDeadlock(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{
		{1, "x", Shared, true, nil},
		{2, "x", Shared, true, nil},
		{1, "x", Exclusive, false, nil},
		{2, "x", Exclusive, false, ErrDeadlock},
	})
	if got := lm.ReleaseAll(2); !reflect.DeepEqual(got, []TxID{1}) {
		t.Errorf("après l'abandon de T2, la montée de T1 doit aboutir ; débloqués = %v", got)
	}
	if got := lm.Holders("x"); !reflect.DeepEqual(got, map[TxID]Mode{1: Exclusive}) {
		t.Errorf("Holders = %v, attendu T1 en exclusif", got)
	}
}

func TestM2LongCycle(t *testing.T) {
	lm := NewLockManager()
	run(t, lm, []step{
		{1, "a", Shared, true, nil},
		{2, "b", Exclusive, true, nil},
		{3, "c", Shared, true, nil},
		{4, "c", Shared, true, nil},
		{1, "b", Exclusive, false, nil}, // T1 → T2
		{5, "d", Exclusive, true, nil},
		{4, "d", Shared, false, nil},    // T4 → T5 : attend, mais hors de tout cycle
		{2, "c", Exclusive, false, nil}, // T2 → T3, T4
		{3, "a", Exclusive, false, ErrDeadlock},
	})
	if got := lm.WaitsFor(2); !reflect.DeepEqual(got, []TxID{3, 4}) {
		t.Errorf("WaitsFor(T2) = %v, attendu [3 4]", got)
	}
}

// ---------- Jalon 3 : le validateur SSI ----------

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func TestM3DoctorsOnCall(t *testing.T) {
	s := NewSSI()
	for _, tx := range []TxID{42, 43} {
		must(t, s.Begin(tx))
		must(t, s.Read(tx, "alice"))
		must(t, s.Read(tx, "bob"))
	}
	must(t, s.Write(42, "alice"))
	must(t, s.Write(43, "bob"))
	if err := s.Commit(42); err != nil {
		t.Fatalf("la première à valider doit réussir, err = %v", err)
	}
	if err := s.Commit(43); !errors.Is(err, ErrSerialization) {
		t.Fatalf("T43 a lu alice, que T42 a modifiée et validée : err = %v, attendu ErrSerialization", err)
	}
	if err := s.Commit(43); !errors.Is(err, ErrUnknownTx) {
		t.Errorf("une transaction abandonnée n'est plus active : err = %v", err)
	}
}

// play joue un déroulé : « B1 » = Begin(T1), « R2:x » = Read(T2, x), « W1:x » = Write, « C1 » = Commit, « A1 » = Abort.
// Il renvoie le résultat du dernier commit.
func play(t *testing.T, script string) error {
	t.Helper()
	s := NewSSI()
	var last error
	for _, op := range strings.Fields(script) {
		tx, key, _ := strings.Cut(op[1:], ":")
		id, err := strconv.Atoi(tx)
		if err != nil {
			t.Fatalf("déroulé invalide : %q", op)
		}
		switch op[0] {
		case 'B':
			must(t, s.Begin(TxID(id)))
		case 'R':
			must(t, s.Read(TxID(id), key))
		case 'W':
			must(t, s.Write(TxID(id), key))
		case 'A':
			must(t, s.Abort(TxID(id)))
		case 'C':
			last = s.Commit(TxID(id))
		}
	}
	return last
}

func TestM3Verdicts(t *testing.T) {
	cases := []struct {
		name, script string
		abort        bool
	}{
		{"lecture seule périmée : rien n'a été écrit sur la prémisse", "B1 B2 W1:alice R2:alice C1 C2", false},
		{"l'écrivain a abandonné : la lecture n'était pas périmée", "B1 B2 W1:alice R2:alice W2:carol A1 C2", false},
		{"T1 validée avant le début de T2 : dans son snapshot", "B1 W1:alice C1 B2 R2:alice W2:bob C2", false},
		{"écriture concurrente après la lecture", "B2 R2:stock W2:order B1 W1:stock C1 C2", true},
		{"lecture MVCC périmée suivie d'une écriture", "B1 B2 W1:alice R2:alice W2:bob C1 C2", true},
		{"écritures concurrentes sur la même clé", "B1 B2 W1:x W2:x C1 C2", true},
		{"aucune clé commune", "B1 B2 R1:a W1:a R2:b W2:b C1 C2", false},
	}
	for _, c := range cases {
		err := play(t, c.script)
		if c.abort && !errors.Is(err, ErrSerialization) {
			t.Errorf("%s (%s) : dernier commit = %v, attendu ErrSerialization", c.name, c.script, err)
		}
		if !c.abort && err != nil {
			t.Errorf("%s (%s) : dernier commit = %v, attendu un succès", c.name, c.script, err)
		}
	}
}

func TestM3ErrorsAndPruning(t *testing.T) {
	s := NewSSI()
	if err := s.Read(9, "a"); !errors.Is(err, ErrUnknownTx) {
		t.Errorf("Read sur une transaction inconnue : err = %v", err)
	}
	must(t, s.Begin(1))
	if err := s.Begin(1); !errors.Is(err, ErrTxExists) {
		t.Errorf("Begin deux fois : err = %v, attendu ErrTxExists", err)
	}
	must(t, s.Begin(2)) // T2, longue, garde en vie les validations qui suivent son début
	must(t, s.Write(1, "a"))
	must(t, s.Commit(1))
	if got := s.Retained(); got != 1 {
		t.Errorf("T2 est concurrente de T1 : la validation de T1 doit être gardée, Retained = %d", got)
	}
	must(t, s.Abort(2))
	if got := s.Retained(); got != 0 {
		t.Errorf("plus aucune transaction concurrente : la base peut tout oublier, Retained = %d", got)
	}
}
