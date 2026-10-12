package lab

import (
	"errors"
	"testing"
)

// ---------- Jalon 1 ----------

func TestM1TimeoutBound(t *testing.T) {
	if got := TimeoutBound(10, 5); got != 25 {
		t.Fatalf("TimeoutBound(10, 5) = %d, attendu 25 (2d + r)", got)
	}
}

func TestM1NoHeartbeatNoSuspicion(t *testing.T) {
	d := NewFailureDetector(10, 3, 50)
	if d.Suspected(1_000_000) {
		t.Fatal("sans aucun battement reçu, on ne soupçonne personne")
	}
	if d.Timeout() != 50 {
		t.Fatalf("Timeout sans historique = %d, attendu le minimum 50", d.Timeout())
	}
}

func TestM1SteadyHeartbeats(t *testing.T) {
	d := NewFailureDetector(10, 3, 50)
	for _, now := range []int64{0, 100, 200, 300} {
		d.Heartbeat(now)
	}
	if d.Timeout() != 100 {
		t.Fatalf("intervalles de 100 ms réguliers : Timeout = %d, attendu 100", d.Timeout())
	}
	if d.Suspected(400) {
		t.Fatal("100 ms depuis le dernier battement : pas encore au-delà du délai d'attente")
	}
	if !d.Suspected(401) {
		t.Fatal("101 ms sans battement avec un délai de 100 : soupçonné")
	}
}

func TestM1TimeoutAdaptsToJitter(t *testing.T) {
	d := NewFailureDetector(10, 2, 50)
	for _, now := range []int64{0, 100, 300, 400, 600} { // intervalles 100, 200, 100, 200
		d.Heartbeat(now)
	}
	// moyenne 150, écart-type 50, k = 2 : 150 + 100 = 250
	if d.Timeout() != 250 {
		t.Fatalf("Timeout = %d, attendu 250 (moyenne 150 + 2 × écart-type 50)", d.Timeout())
	}
}

func TestM1WindowForgetsOldIntervals(t *testing.T) {
	d := NewFailureDetector(3, 3, 10)
	for _, now := range []int64{0, 1000, 1100, 1200, 1300} { // un premier intervalle de 1000, puis 100 100 100
		d.Heartbeat(now)
	}
	if d.Timeout() != 100 {
		t.Fatalf("seuls les 3 derniers intervalles comptent : Timeout = %d, attendu 100", d.Timeout())
	}
}

func TestM1NeverBelowMinimum(t *testing.T) {
	d := NewFailureDetector(10, 3, 500)
	for _, now := range []int64{0, 10, 20, 30} {
		d.Heartbeat(now)
	}
	if d.Timeout() != 500 {
		t.Fatalf("Timeout = %d, attendu le minimum 500", d.Timeout())
	}
}

func TestM1PauseThenRevive(t *testing.T) {
	d := NewFailureDetector(10, 3, 50)
	for _, now := range []int64{0, 100, 200, 300} {
		d.Heartbeat(now)
	}
	if !d.Suspected(1100) { // pause de 800 ms (GC) : le nœud est soupçonné à tort
		t.Fatal("une pause de 800 ms dépasse le délai d'attente de 100 ms")
	}
	d.Heartbeat(1150) // il se réveille
	if d.Suspected(1200) {
		t.Fatal("après un nouveau battement, le soupçon est levé")
	}
	if d.Timeout() <= 100 {
		t.Fatalf("la pause a élargi les intervalles : le délai d'attente doit augmenter (%d)", d.Timeout())
	}
}

// ---------- Jalon 2 ----------

func TestM2LamportOrdersCausalEvents(t *testing.T) {
	var a, b Lamport
	if a.Tick() != 1 || a.Tick() != 2 {
		t.Fatal("Tick incrémente de 1")
	}
	sent := a.Tick() // 3
	got := b.Receive(sent)
	if got != 4 {
		t.Fatalf("Receive(3) sur une horloge à 0 = %d, attendu 4 (max + 1)", got)
	}
	if b.Receive(1) != 5 {
		t.Fatal("recevoir un horodatage plus ancien n'avance que d'un cran")
	}
}

func TestM2PhysicalTimestampsLoseACausallyLaterWrite(t *testing.T) {
	// figure 8-3 : l'horloge du nœud 1 avance ; l'incrément de B, causalement postérieur, a un horodatage plus petit
	a := LWWValue{Value: "x=1", TS: 42004, Node: "n1"}
	b := LWWValue{Value: "x=2", TS: 42003, Node: "n3"}
	if got := NewerLWW(a, b); got.Value != "x=1" {
		t.Fatalf("avec des horodatages physiques, LWW garde %q : l'incrément de B est perdu (attendu x=1)", got.Value)
	}
	if got := NewerLWW(b, a); got.Value != "x=1" {
		t.Fatal("NewerLWW doit être symétrique")
	}
}

func TestM2LamportPreservesCausality(t *testing.T) {
	var n1, n3 Lamport
	write := LWWValue{Value: "x=1", TS: n1.Tick(), Node: "n1"}
	n3.Receive(write.TS) // n3 reçoit la réplication de x=1
	incr := LWWValue{Value: "x=2", TS: n3.Tick(), Node: "n3"}
	if got := NewerLWW(write, incr); got.Value != "x=2" {
		t.Fatalf("avec une horloge logique, l'écriture causalement postérieure gagne : %q", got.Value)
	}
}

func TestM2LWWTiesGoToTheLargerNode(t *testing.T) {
	a := LWWValue{Value: "a", TS: 7, Node: "n1"}
	b := LWWValue{Value: "b", TS: 7, Node: "n2"}
	if NewerLWW(a, b).Value != "b" || NewerLWW(b, a).Value != "b" {
		t.Fatal("à horodatage égal, le plus grand identifiant de nœud gagne, quel que soit l'ordre des arguments")
	}
}

func TestM2Intervals(t *testing.T) {
	a := Interval{10, 20}
	b := Interval{21, 30}
	c := Interval{15, 25}
	if !a.Before(b) || b.Before(a) {
		t.Fatal("[10,20] est sûrement avant [21,30]")
	}
	if a.Before(c) || c.Before(a) || !a.Overlaps(c) || !c.Overlaps(a) {
		t.Fatal("[10,20] et [15,25] se chevauchent : on ne peut pas les ordonner")
	}
	if a.Overlaps(b) {
		t.Fatal("pas de chevauchement")
	}
	if (Interval{10, 20}).Before(Interval{20, 30}) {
		t.Fatal("un intervalle qui touche l'autre (Latest = Earliest) ne permet pas de conclure")
	}
}

func TestM2TrueTime(t *testing.T) {
	now := int64(1000)
	tt := NewTrueTime(func() int64 { return now }, 7)
	if iv := tt.Now(); iv.Earliest != 993 || iv.Latest != 1007 {
		t.Fatalf("Now = %+v, attendu [993, 1007]", iv)
	}
	if tt.After(1000) || !tt.After(992) {
		t.Fatal("After(ts) est vrai quand Earliest > ts")
	}
}

func TestM2CommitWaitSeparatesTransactions(t *testing.T) {
	now := int64(1000)
	slept := int64(0)
	tt := NewTrueTime(func() int64 { return now }, 7)
	ts := CommitWait(tt, func(ms int64) { now += ms; slept += ms })
	if ts != 1007 {
		t.Fatalf("horodatage de validation = %d, attendu 1007 (Now().Latest)", ts)
	}
	if slept != 15 {
		t.Fatalf("attente = %d ms, attendu 15 (jusqu'à ce que Earliest dépasse 1007, soit 2 × eps + 1)", slept)
	}
	// une transaction qui démarre juste après la fin de l'attente a un intervalle strictement postérieur
	next := tt.Now()
	if !(Interval{ts, ts}).Before(next) {
		t.Fatalf("l'intervalle suivant %+v doit être strictement après ts = %d", next, ts)
	}
}

// ---------- Jalon 3 ----------

func TestM3LeaseAndTokens(t *testing.T) {
	ls := NewLockService(30, 33)
	tok, ok := ls.Acquire("c1", 0)
	if !ok || tok != 33 {
		t.Fatalf("premier octroi : %d %v, attendu 33", tok, ok)
	}
	if _, ok := ls.Acquire("c2", 10); ok {
		t.Fatal("le bail de c1 court jusqu'à 30 : c2 est refusé")
	}
	if tok, ok := ls.Acquire("c1", 20); !ok || tok != 33 {
		t.Fatalf("renouvellement : %d %v, attendu le même jeton 33", tok, ok)
	}
	if _, ok := ls.Acquire("c2", 49); ok {
		t.Fatal("le renouvellement a prolongé le bail jusqu'à 50")
	}
	tok2, ok := ls.Acquire("c2", 50)
	if !ok || tok2 != 34 {
		t.Fatalf("après expiration, c2 reçoit un jeton plus grand : %d %v, attendu 34", tok2, ok)
	}
	if ls.Valid("c1", 33, 51) || !ls.Valid("c2", 34, 51) {
		t.Fatal("Valid: c1 n'a plus le bail, c2 l'a")
	}
	if ls.Valid("c2", 34, 80) {
		t.Fatal("le bail de c2 a expiré à 80")
	}
}

func TestM3FencingRejectsAPausedClient(t *testing.T) {
	ls := NewLockService(30, 33)
	var store FencedStorage
	tok1, _ := ls.Acquire("c1", 0)
	// c1 se fige (pause GC) ; son bail expire ; c2 prend le relais
	tok2, ok := ls.Acquire("c2", 40)
	if !ok || tok2 != 34 {
		t.Fatalf("c2 : %d %v", tok2, ok)
	}
	if err := store.Write(tok2, "écrit par c2"); err != nil {
		t.Fatal(err)
	}
	// c1 se réveille, croit toujours détenir le bail et écrit avec son vieux jeton
	if ls.Valid("c1", tok1, 45) {
		t.Fatal("c1 n'a plus de bail valide, même s'il l'ignore")
	}
	if err := store.Write(tok1, "écrit par c1"); !errors.Is(err, ErrStaleToken) {
		t.Fatalf("écriture avec le jeton 33 après le 34 : %v, attendu ErrStaleToken", err)
	}
	if store.Data() != "écrit par c2" {
		t.Fatalf("données = %q : l'écriture périmée ne doit rien changer", store.Data())
	}
	if err := store.Write(tok2, "encore c2"); err != nil {
		t.Fatalf("le même jeton peut écrire plusieurs fois : %v", err)
	}
}

func TestM3QuorumDecides(t *testing.T) {
	for n, want := range map[int]int{1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 7: 4} {
		if got := Majority(n); got != want {
			t.Errorf("Majority(%d) = %d, attendu %d", n, got, want)
		}
	}
	if !DeclaredDead(2, 3) || DeclaredDead(1, 3) || !DeclaredDead(3, 5) || DeclaredDead(2, 5) || DeclaredDead(2, 4) {
		t.Fatal("un nœud est déclaré mort quand une majorité stricte le dit")
	}
}

func TestM3CheckFencingSafetyProperties(t *testing.T) {
	if err := CheckFencing([]int{33, 34, 35}); err != nil {
		t.Fatalf("suite valide refusée : %v", err)
	}
	if err := CheckFencing(nil); err != nil {
		t.Fatal("suite vide valide")
	}
	if err := CheckFencing([]int{33, 34, 33}); err == nil {
		t.Fatal("un jeton accordé deux fois viole l'unicité")
	}
	if err := CheckFencing([]int{34, 33}); err == nil {
		t.Fatal("une suite décroissante viole la propriété de croissance")
	}
}
