package lab

import (
	"errors"
	"reflect"
	"testing"
)

func sampleLog() []Request {
	return []Request{
		{ID: "t1", From: "alice", To: "bob", Amount: 11},
		{ID: "t2", From: "bob", To: "carol", Amount: 5},
		{ID: "t3", From: "carol", To: "alice", Amount: 3},
		{ID: "t4", From: "alice", To: "dave", Amount: 40},
	}
}

// ---------- Jalon 1 ----------

func TestM1SubmitRejectsInvalid(t *testing.T) {
	cases := []struct {
		name string
		r    Request
	}{
		{"sans identifiant", Request{From: "a", To: "b", Amount: 1}},
		{"sans payeur", Request{ID: "x", To: "b", Amount: 1}},
		{"sans bénéficiaire", Request{ID: "x", From: "a", Amount: 1}},
		{"virement vers soi-même", Request{ID: "x", From: "a", To: "a", Amount: 1}},
		{"montant nul", Request{ID: "x", From: "a", To: "b"}},
		{"montant négatif", Request{ID: "x", From: "a", To: "b", Amount: -5}},
	}
	for _, c := range cases {
		s := NewService()
		if _, _, err := s.Submit(c.r); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s : err = %v, attendu ErrInvalid", c.name, err)
		}
		if len(s.Log()) != 0 {
			t.Errorf("%s : une requête invalide ne doit pas entrer dans le log", c.name)
		}
	}
}

func TestM1SubmitDeduplicatesByRequestID(t *testing.T) {
	s := NewService()
	r1 := Request{ID: "0286FDB8", From: "4321", To: "1234", Amount: 11}
	r2 := Request{ID: "77AA", From: "1234", To: "4321", Amount: 2}
	if off, dup, err := s.Submit(r1); off != 0 || dup || err != nil {
		t.Fatalf("1er envoi : %d, %v, %v ; attendu 0, false, nil", off, dup, err)
	}
	if off, dup, err := s.Submit(r2); off != 1 || dup || err != nil {
		t.Fatalf("2e requête : %d, %v, %v ; attendu 1, false, nil", off, dup, err)
	}
	off, dup, err := s.Submit(r1)
	if off != 0 || !dup || err != nil {
		t.Errorf("réessai de r1 : %d, %v, %v ; attendu la position d'origine 0, dup = true, nil", off, dup, err)
	}
	if n := len(s.Log()); n != 2 {
		t.Errorf("le réessai ne doit rien ajouter au log : %d entrées, attendu 2", n)
	}
	bad := r1
	bad.Amount = 99
	if _, _, err := s.Submit(bad); !errors.Is(err, ErrIDReuse) {
		t.Errorf("même identifiant, autre montant : err = %v, attendu ErrIDReuse (une clé = une opération)", err)
	}
	if n := len(s.Log()); n != 2 {
		t.Errorf("une réutilisation d'identifiant ne doit rien ajouter : %d entrées", n)
	}
}

func TestM1LogIsACopy(t *testing.T) {
	s := NewService()
	s.Submit(Request{ID: "a", From: "x", To: "y", Amount: 1})
	l := s.Log()
	l[0].Amount = 1000
	if s.Log()[0].Amount != 1 {
		t.Error("Log doit renvoyer une copie : modifier le résultat ne doit pas réécrire le log")
	}
}

func TestM1SplitIsDeterministic(t *testing.T) {
	r := Request{ID: "t1", From: "alice", To: "bob", Amount: 11}
	want := []Instruction{
		{RequestID: "t1", Account: "alice", Op: Debit, Amount: 11},
		{RequestID: "t1", Account: "bob", Op: Credit, Amount: 11},
	}
	if got := Split(r); !reflect.DeepEqual(got, want) {
		t.Errorf("Split = %v, attendu %v — le débit du payeur puis le crédit du bénéficiaire, avec l'identifiant d'origine", got, want)
	}
}

func TestM1ApplyIsIdempotent(t *testing.T) {
	sh := NewShards(1)[0]
	in := Instruction{RequestID: "t1", Account: "alice", Op: Debit, Amount: 11}
	if !sh.Apply(in) {
		t.Fatal("la première application doit renvoyer true")
	}
	if sh.Apply(in) {
		t.Error("la même instruction relivrée doit être ignorée (false)")
	}
	if got := sh.Balance("alice"); got != -11 {
		t.Errorf("solde d'alice = %d, attendu -11 — un débit appliqué une seule fois", got)
	}
	sh.Apply(Instruction{RequestID: "t2", Account: "alice", Op: Credit, Amount: 4})
	if got := sh.Balance("alice"); got != -7 {
		t.Errorf("solde d'alice = %d, attendu -7 après un crédit de 4", got)
	}
}

func TestM1DeliverRoutesByAccount(t *testing.T) {
	shards := NewShards(4)
	Deliver(shards, sampleLog())
	want := map[string]int64{"alice": -48, "bob": 6, "carol": 2, "dave": 40}
	for acc, v := range want {
		p := Partition(acc, 4)
		if got := shards[p].Balance(acc); got != v {
			t.Errorf("solde de %s dans sa partition %d = %d, attendu %d", acc, p, got, v)
		}
		for i, sh := range shards {
			if i != p && sh.Balance(acc) != 0 {
				t.Errorf("%s apparaît dans la partition %d : chaque instruction va à la partition de son compte", acc, i)
			}
		}
	}
}

func TestM1RedeliveryAfterCrashChangesNothing(t *testing.T) {
	ref := NewShards(3)
	Deliver(ref, sampleLog())
	crashed := NewShards(3)
	Deliver(crashed, sampleLog()[:2]) // le répartiteur plante après deux requêtes…
	Deliver(crashed, sampleLog())     // …et reprend depuis un point de contrôle plus ancien
	var total int64
	for _, acc := range []string{"alice", "bob", "carol", "dave"} {
		p := Partition(acc, 3)
		if a, b := crashed[p].Balance(acc), ref[p].Balance(acc); a != b {
			t.Errorf("après relivraison, solde de %s = %d, attendu %d — dédupliquer par identifiant de requête", acc, a, b)
		}
		total += crashed[p].Balance(acc)
	}
	if total != 0 {
		t.Errorf("somme des soldes = %d : un virement ne crée ni ne détruit d'argent", total)
	}
}

// ---------- Jalon 2 ----------

func TestM2Normalize(t *testing.T) {
	for in, want := range map[string]string{"Ada": "ada", "  ADA ": "ada", "grace": "grace"} {
		if got := Normalize(in); got != want {
			t.Errorf("Normalize(%q) = %q, attendu %q", in, got, want)
		}
	}
}

func TestM2FirstInLogWins(t *testing.T) {
	reg := NewRegistry(8)
	p1 := reg.Append(Claim{RequestID: "r1", Username: "Ada", UserID: "u1"})
	p2 := reg.Append(Claim{RequestID: "r2", Username: " ada", UserID: "u2"})
	if p1 != Partition("ada", 8) || p1 != p2 {
		t.Fatalf("partitions %d et %d : les demandes en conflit doivent tomber dans la partition du pseudo normalisé (%d)", p1, p2, Partition("ada", 8))
	}
	got := reg.Process(p1)
	want := []Outcome{{RequestID: "r1", Username: "ada", UserID: "u1", OK: true}, {RequestID: "r2", Username: "ada", UserID: "u2", OK: false}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Process = %v\nattendu %v — le premier arrivé dans le log gagne, le second est refusé", got, want)
	}
	if id, ok := reg.Owner("ADA"); !ok || id != "u1" {
		t.Errorf("Owner(\"ADA\") = %q, %v ; attendu u1, true", id, ok)
	}
	if again := reg.Process(p1); len(again) != 0 {
		t.Errorf("un second Process sans nouvelle demande doit ne rien émettre, a émis %v", again)
	}
}

func TestM2RetriesGetTheSameOutcome(t *testing.T) {
	reg := NewRegistry(4)
	p := reg.Append(Claim{RequestID: "r1", Username: "linus", UserID: "u1"})
	reg.Append(Claim{RequestID: "r2", Username: "Linus", UserID: "u2"})
	reg.Process(p)
	reg.Append(Claim{RequestID: "r1", Username: "linus", UserID: "u1"}) // réessai du gagnant
	reg.Append(Claim{RequestID: "r2", Username: "Linus", UserID: "u2"}) // réessai du perdant
	reg.Append(Claim{RequestID: "r9", Username: "LINUS", UserID: "u1"}) // le propriétaire redemande son pseudo
	got := reg.Process(p)
	if len(got) != 3 || !got[0].OK || got[1].OK || !got[2].OK {
		t.Errorf("Process = %v — un réessai reçoit la même décision qu'au premier passage, et le propriétaire garde son pseudo", got)
	}
}

func TestM2ProcessingOrderAcrossPartitionsDoesNotMatter(t *testing.T) {
	names := []string{"ada", "grace", "linus", "barbara", "ken", "margaret", "edsger", "donald"}
	reg := NewRegistry(4)
	for _, n := range names {
		reg.Append(Claim{RequestID: "a" + n, Username: n, UserID: "first"})
		reg.Append(Claim{RequestID: "b" + n, Username: n, UserID: "second"})
	}
	for p := 3; p >= 0; p-- { // partitions traitées dans le désordre, chacune séquentiellement
		reg.Process(p)
	}
	for _, n := range names {
		if id, ok := reg.Owner(n); !ok || id != "first" {
			t.Errorf("Owner(%q) = %q, %v ; attendu first — seul l'ordre dans la partition compte", n, id, ok)
		}
	}
}

// ---------- Jalon 3 ----------

func TestM3ExpectedIgnoresDuplicateIDs(t *testing.T) {
	log := append(sampleLog(), Request{ID: "t1", From: "alice", To: "bob", Amount: 11})
	got := Expected(log)
	want := map[string]int64{"alice": -48, "bob": 6, "carol": 2, "dave": 40}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Expected = %v, attendu %v — t1 apparaît deux fois mais ne compte qu'une", got, want)
	}
}

func TestM3CleanPipelinePassesAudit(t *testing.T) {
	s := NewService()
	for _, r := range sampleLog() {
		s.Submit(r)
		s.Submit(r) // réessais
	}
	shards := NewShards(3)
	Deliver(shards, s.Log())
	Deliver(shards, s.Log())
	observed := Collect(shards)
	if observed["alice"] != -48 || observed["dave"] != 40 {
		t.Fatalf("Collect = %v — rassemble les soldes de toutes les partitions", observed)
	}
	if d := Audit(s.Log(), observed); len(d) != 0 {
		t.Errorf("Audit sur un pipeline sain = %v, attendu aucun écart", d)
	}
}

func TestM3AuditFindsCorruption(t *testing.T) {
	observed := map[string]int64{"alice": -48, "bob": 17, "carol": 2, "mallory": 500}
	got := Audit(sampleLog(), observed)
	want := []Discrepancy{
		{Account: "bob", Expected: 6, Got: 17},
		{Account: "dave", Expected: 40, Got: 0},
		{Account: "mallory", Expected: 0, Got: 500},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Audit = %v\nattendu %v — crédit appliqué deux fois, compte disparu, argent apparu de nulle part ; triés par compte", got, want)
	}
}
