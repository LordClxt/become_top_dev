package lab

import (
	"errors"
	"sync"
	"testing"
	"time"
)

const ms = time.Millisecond

// beats envoie un battement à l'instant courant, puis un après chaque intervalle.
func beats(c *ManualClock, d *Detector, node string, intervals ...time.Duration) {
	d.Heartbeat(node)
	for _, iv := range intervals {
		c.Advance(iv)
		d.Heartbeat(node)
	}
}

// ---------- Jalon 1 : le détecteur adaptatif ----------

func TestM1TimeoutFromHistory(t *testing.T) {
	cases := []struct {
		name      string
		intervals []time.Duration
		window    int
		k         float64
		min       time.Duration
		want      time.Duration
	}{
		{"aucun battement : le minimum", nil, 10, 2, 50 * ms, 50 * ms},
		{"un seul battement : le minimum", []time.Duration{}, 10, 2, 50 * ms, 50 * ms},
		{"battements réguliers : écart-type nul", []time.Duration{100 * ms, 100 * ms, 100 * ms}, 10, 3, 50 * ms, 100 * ms},
		{"gigue : moyenne + k × écart-type", []time.Duration{100 * ms, 300 * ms, 100 * ms, 300 * ms}, 10, 2, 50 * ms, 400 * ms},
		{"plancher : jamais sous le minimum", []time.Duration{10 * ms, 10 * ms}, 10, 2, 50 * ms, 50 * ms},
		{"fenêtre : les vieux intervalles sont oubliés", []time.Duration{1000 * ms, 1000 * ms, 1000 * ms, 100 * ms, 100 * ms, 100 * ms}, 3, 2, 10 * ms, 100 * ms},
	}
	for _, c := range cases {
		clock := &ManualClock{}
		d := NewDetector(clock, c.window, c.k, c.min)
		if c.intervals != nil {
			beats(clock, d, "n1", c.intervals...)
		}
		if got := d.Timeout("n1"); got != c.want {
			t.Errorf("%s : Timeout = %v, attendu %v", c.name, got, c.want)
		}
	}
}

func TestM1SuspectedStrictlyAfterTimeout(t *testing.T) {
	clock := &ManualClock{}
	d := NewDetector(clock, 10, 3, 50*ms)
	beats(clock, d, "n1", 100*ms, 100*ms, 100*ms)
	clock.Advance(100 * ms)
	if d.Suspected("n1") {
		t.Error("un silence égal au timeout (100 ms) n'est pas encore suspect : il faut le DÉPASSER")
	}
	clock.Advance(1 * ms)
	if !d.Suspected("n1") {
		t.Error("101 ms de silence pour un timeout de 100 ms : le nœud doit être suspect")
	}
	d.Heartbeat("n1")
	if d.Suspected("n1") {
		t.Error("un nouveau battement doit lever le soupçon")
	}
}

func TestM1UnknownNodeIsSuspected(t *testing.T) {
	d := NewDetector(&ManualClock{}, 10, 2, 50*ms)
	if !d.Suspected("jamais-vu") {
		t.Error("un nœud dont on n'a jamais reçu de battement doit être suspect")
	}
}

func TestM1AdaptsPerNode(t *testing.T) {
	clock := &ManualClock{}
	d := NewDetector(clock, 20, 4, 10*ms)
	// Deux nœuds : l'un bat toutes les 100 ms, l'autre à 100 puis 300 ms d'intervalle, en alternance.
	for i := 0; i < 40; i++ {
		if i > 0 {
			clock.Advance(100 * ms)
		}
		d.Heartbeat("calme")
		if i%4 <= 1 {
			d.Heartbeat("agite")
		}
	}
	calm, jittery := d.Timeout("calme"), d.Timeout("agite")
	if calm != 100*ms {
		t.Errorf("nœud régulier (toutes les 100 ms) : Timeout = %v, attendu 100ms", calm)
	}
	if jittery <= calm {
		t.Errorf("nœud irrégulier : Timeout = %v, attendu plus long que celui du nœud régulier (%v) — le timeout suit la gigue", jittery, calm)
	}
	clock.Advance(150 * ms)
	if !d.Suspected("calme") || d.Suspected("agite") {
		t.Error("150 ms de silence : anormal pour le nœud régulier, banal pour l'irrégulier")
	}
}

// ---------- Jalon 2 : le service de baux ----------

func TestM2AcquireAndExpire(t *testing.T) {
	clock := &ManualClock{}
	s := NewLeaseService(clock, 10*time.Second)
	l1, err := s.Acquire("a")
	if err != nil || l1.Holder != "a" || l1.Token != 1 || l1.Expires != 10*time.Second {
		t.Fatalf("premier Acquire = %+v, %v ; attendu {a 1 10s}, nil — les jetons commencent à 1", l1, err)
	}
	if _, err := s.Acquire("b"); !errors.Is(err, ErrLeaseHeld) {
		t.Errorf("b demande un bail encore valide détenu par a : err = %v, attendu ErrLeaseHeld", err)
	}
	same, err := s.Acquire("a")
	if err != nil || same != l1 {
		t.Errorf("a redemande son propre bail valide : %+v, %v ; attendu le même bail %+v", same, err, l1)
	}
	clock.Advance(10 * time.Second)
	l2, err := s.Acquire("b")
	if err != nil || l2.Holder != "b" || l2.Token != 2 {
		t.Fatalf("à l'échéance exacte le bail a expiré : Acquire(b) = %+v, %v ; attendu jeton 2", l2, err)
	}
	clock.Advance(10 * time.Second)
	l3, err := s.Acquire("a")
	if err != nil || l3.Token != 3 {
		t.Errorf("chaque nouvelle attribution doit augmenter le jeton : %+v, %v ; attendu 3", l3, err)
	}
}

func TestM2Renew(t *testing.T) {
	clock := &ManualClock{}
	s := NewLeaseService(clock, 10*time.Second)
	l, _ := s.Acquire("a")
	clock.Advance(7 * time.Second)
	r, err := s.Renew("a", l.Token)
	if err != nil || r.Token != l.Token || r.Expires != 17*time.Second {
		t.Fatalf("Renew = %+v, %v ; attendu même jeton, échéance 17s", r, err)
	}
	clock.Advance(9 * time.Second)
	if _, err := s.Acquire("b"); !errors.Is(err, ErrLeaseHeld) {
		t.Error("le bail renouvelé court jusqu'à 17 s : b ne doit pas l'obtenir à 16 s")
	}
	if _, err := s.Renew("b", l.Token); !errors.Is(err, ErrNotHolder) {
		t.Errorf("b ne détient pas le bail : err = %v, attendu ErrNotHolder", err)
	}
	if _, err := s.Renew("a", l.Token+1); !errors.Is(err, ErrNotHolder) {
		t.Errorf("mauvais jeton : err = %v, attendu ErrNotHolder", err)
	}
	clock.Advance(1 * time.Second)
	if _, err := s.Renew("a", l.Token); !errors.Is(err, ErrNotHolder) {
		t.Errorf("bail expiré : Renew doit échouer (err = %v) — un bail expiré se redemande, avec un nouveau jeton", err)
	}
}

func TestM2ConcurrentAcquireGrantsOne(t *testing.T) {
	s := NewLeaseService(&ManualClock{}, time.Minute)
	var wg sync.WaitGroup
	var mu sync.Mutex
	winners := 0
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if _, err := s.Acquire(string(rune('a' + i))); err == nil {
				mu.Lock()
				winners++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	if winners != 1 {
		t.Errorf("20 clients demandent le bail en même temps : %d l'ont obtenu, attendu exactement 1", winners)
	}
}

// ---------- Jalon 3 : le stockage qui vérifie les jetons ----------

func TestM3StoreRejectsStaleTokens(t *testing.T) {
	s := NewStore()
	steps := []struct {
		value string
		token uint64
		want  error
	}{
		{"v41", 41, nil},
		{"v42", 42, nil},
		{"v42-bis", 42, nil},
		{"zombie", 41, ErrStaleToken},
		{"sans-jeton", 0, ErrMissingToken},
		{"v43", 43, nil},
	}
	for _, st := range steps {
		if err := s.Write("f", st.value, st.token); !errors.Is(err, st.want) {
			t.Errorf("Write(%q, jeton %d) : err = %v, attendu %v", st.value, st.token, err, st.want)
		}
	}
	if v, ok := s.Get("f"); !ok || v != "v43" {
		t.Errorf("Get = %q, %v ; attendu v43 — une écriture rejetée ne doit rien changer", v, ok)
	}
	if h := s.HighestToken("f"); h != 43 {
		t.Errorf("HighestToken = %d, attendu 43", h)
	}
	if err := s.Write("autre", "x", 1); err != nil {
		t.Errorf("chaque clé a son propre plus grand jeton : Write(autre, 1) = %v", err)
	}
	if _, ok := s.Get("absente"); ok {
		t.Error("Get d'une clé jamais écrite doit renvoyer ok = false")
	}
}

// Le scénario du livre : le client 1 se fige, son bail expire, le client 2 écrit ; le client 1 se réveille.
func TestM3ZombieClientIsFenced(t *testing.T) {
	clock := &ManualClock{}
	locks := NewLeaseService(clock, 10*time.Second)
	store := NewStore()

	l1, err := locks.Acquire("client-1")
	if err != nil {
		t.Fatal(err)
	}
	// Le client 1 vérifie son bail : il est valide. Puis il se fige 15 s (pause GC).
	stillValid := clock.Now() < l1.Expires
	clock.Advance(15 * time.Second)

	l2, err := locks.Acquire("client-2")
	if err != nil {
		t.Fatalf("après expiration, client-2 doit obtenir le bail : %v", err)
	}
	if l2.Token <= l1.Token {
		t.Fatalf("jeton de client-2 (%d) ≤ jeton de client-1 (%d) : les jetons doivent croître", l2.Token, l1.Token)
	}
	if err := store.Write("fichier", "données de client-2", l2.Token); err != nil {
		t.Fatalf("client-2 détient le bail courant, son écriture doit passer : %v", err)
	}
	// Le client 1 se réveille, persuadé que son bail est valide.
	if !stillValid {
		t.Fatal("le client 1 avait vérifié un bail valide avant sa pause")
	}
	if err := store.Write("fichier", "données de client-1", l1.Token); !errors.Is(err, ErrStaleToken) {
		t.Errorf("le zombie écrit avec un jeton périmé : err = %v, attendu ErrStaleToken", err)
	}
	if v, _ := store.Get("fichier"); v != "données de client-2" {
		t.Errorf("fichier = %q : le zombie a écrasé les données de client-2", v)
	}
	if _, err := locks.Renew("client-1", l1.Token); !errors.Is(err, ErrNotHolder) {
		t.Errorf("le zombie tente de renouveler : err = %v, attendu ErrNotHolder", err)
	}
}

// Le détecteur déclenche la bascule ; le stockage, lui, garantit la sûreté quoi qu'en pense le détecteur.
func TestM3FailoverWithDetector(t *testing.T) {
	clock := &ManualClock{}
	det := NewDetector(clock, 10, 3, 100*ms)
	locks := NewLeaseService(clock, 2*time.Second)
	store := NewStore()

	leader, _ := locks.Acquire("A")
	beats(clock, det, "A", 500*ms, 500*ms, 500*ms)
	if err := store.Write("k", "a1", leader.Token); err != nil {
		t.Fatal(err)
	}
	if l, err := locks.Renew("A", leader.Token); err != nil {
		t.Fatalf("A renouvelle à 1,5 s : %v", err)
	} else {
		leader = l
	}
	// A se fige : plus de battements.
	clock.Advance(600 * ms)
	if !det.Suspected("A") {
		t.Fatal("600 ms sans battement pour des battements réguliers à 500 ms : A doit être suspect")
	}
	// Le soupçon ne suffit pas : tant que le bail court, B ne l'obtient pas.
	if _, err := locks.Acquire("B"); !errors.Is(err, ErrLeaseHeld) {
		t.Fatalf("A est suspect mais son bail court encore : err = %v, attendu ErrLeaseHeld", err)
	}
	clock.Advance(2 * time.Second)
	nb, err := locks.Acquire("B")
	if err != nil {
		t.Fatalf("bail de A expiré : B doit l'obtenir (%v)", err)
	}
	if err := store.Write("k", "b1", nb.Token); err != nil {
		t.Fatal(err)
	}
	if err := store.Write("k", "a2", leader.Token); !errors.Is(err, ErrStaleToken) {
		t.Errorf("A se réveille et écrit : err = %v, attendu ErrStaleToken", err)
	}
	if v, _ := store.Get("k"); v != "b1" {
		t.Errorf("k = %q, attendu b1", v)
	}
}
