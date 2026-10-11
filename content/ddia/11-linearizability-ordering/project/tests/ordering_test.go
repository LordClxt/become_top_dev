package lab

import (
	"errors"
	"reflect"
	"testing"
)

// ---------- Jalon 1 ----------

func TestM1TickAndNow(t *testing.T) {
	c := NewClock(7)
	if got := c.Now(); got != (Timestamp{0, 7}) {
		t.Errorf("Now() d'une horloge neuve = %v, attendu {0 7}", got)
	}
	for i := uint64(1); i <= 3; i++ {
		if got := c.Tick(); got != (Timestamp{i, 7}) {
			t.Errorf("Tick() n°%d = %v, attendu {%d 7} — chaque événement local avance le compteur de 1", i, got, i)
		}
	}
	if got := c.Now(); got != (Timestamp{3, 7}) {
		t.Errorf("Now() ne doit pas avancer l'horloge : %v, attendu {3 7}", got)
	}
}

func TestM1Observe(t *testing.T) {
	cases := []struct {
		name  string
		local int
		seen  uint64
		want  uint64
	}{
		{"message venu du futur", 2, 10, 11},
		{"message en retard", 9, 4, 10},
		{"même compteur", 5, 5, 6},
		{"horloge neuve", 0, 0, 1},
	}
	for _, c := range cases {
		clk := NewClock(1)
		for i := 0; i < c.local; i++ {
			clk.Tick()
		}
		got := clk.Observe(Timestamp{Counter: c.seen, Node: 2})
		if got != (Timestamp{c.want, 1}) {
			t.Errorf("%s : local=%d, reçu=%d → Observe = %v, attendu {%d 1} — max(local, reçu) + 1, avec SON identifiant", c.name, c.local, c.seen, got, c.want)
		}
	}
}

func TestM1CausalityRespected(t *testing.T) {
	a, b := NewClock(1), NewClock(2)
	for i := 0; i < 5; i++ {
		b.Tick()
	}
	send := a.Tick()
	recv := b.Observe(send)
	reply := b.Tick()
	back := a.Observe(reply)
	if !send.Less(recv) || !recv.Less(reply) || !reply.Less(back) {
		t.Errorf("envoi %v → réception %v → réponse %v → réception %v : chaque cause doit être strictement plus petite que son effet", send, recv, reply, back)
	}
}

func TestM1TotalOrder(t *testing.T) {
	cases := []struct {
		a, b Timestamp
		want bool
	}{
		{Timestamp{1, 9}, Timestamp{2, 1}, true},
		{Timestamp{3, 1}, Timestamp{2, 9}, false},
		{Timestamp{4, 1}, Timestamp{4, 2}, true},
		{Timestamp{4, 2}, Timestamp{4, 1}, false},
		{Timestamp{4, 2}, Timestamp{4, 2}, false},
	}
	for _, c := range cases {
		if got := c.a.Less(c.b); got != c.want {
			t.Errorf("%v.Less(%v) = %v, attendu %v — compteur d'abord, puis identifiant de nœud pour départager", c.a, c.b, got, c.want)
		}
	}
	ts := []Timestamp{{5, 2}, {1, 3}, {5, 1}, {2, 2}, {1, 1}}
	SortTimestamps(ts)
	want := []Timestamp{{1, 1}, {1, 3}, {2, 2}, {5, 1}, {5, 2}}
	if !reflect.DeepEqual(ts, want) {
		t.Errorf("SortTimestamps = %v, attendu %v", ts, want)
	}
}

// ---------- Jalon 2 ----------

func w(c string, v, s, e int) Op { return Op{Client: c, Kind: OpWrite, Arg: v, Start: s, End: e} }
func r(c string, v, s, e int) Op { return Op{Client: c, Kind: OpRead, Result: v, Start: s, End: e} }
func cas(c string, from, to int, ok bool, s, e int) Op {
	return Op{Client: c, Kind: OpCAS, Expect: from, Arg: to, OK: ok, Start: s, End: e}
}

// valid rejoue l'ordre proposé : il doit être une permutation, respecter le temps réel et le registre.
func valid(t *testing.T, initial int, h []Op, order []int) {
	t.Helper()
	if len(order) != len(h) {
		t.Fatalf("l'ordre renvoyé a %d opérations, l'historique %d", len(order), len(h))
	}
	pos := map[int]int{}
	for p, i := range order {
		if _, dup := pos[i]; dup || i < 0 || i >= len(h) {
			t.Fatalf("ordre %v : ce n'est pas une permutation des indices", order)
		}
		pos[i] = p
	}
	for i := range h {
		for j := range h {
			if h[i].End < h[j].Start && pos[i] > pos[j] {
				t.Errorf("ordre %v : l'opération %d finit avant que %d commence, elle doit venir avant", order, i, j)
			}
		}
	}
	state := initial
	for _, i := range order {
		next, ok := replay(h[i], state)
		if !ok {
			t.Errorf("ordre %v : l'opération %d (%+v) est impossible quand le registre vaut %d", order, i, h[i], state)
			return
		}
		state = next
	}
}

// replay est la sémantique de référence du registre, indépendante de ton code.
func replay(op Op, state int) (int, bool) {
	switch op.Kind {
	case OpWrite:
		return op.Arg, true
	case OpRead:
		return state, op.Result == state
	case OpCAS:
		if state == op.Expect {
			return op.Arg, op.OK
		}
		return state, !op.OK
	}
	return state, false
}

func TestM2Linearizable(t *testing.T) {
	cases := []struct {
		name string
		h    []Op
	}{
		{"séquentiel", []Op{w("A", 1, 0, 1), r("B", 1, 2, 3)}},
		{"lecture concurrente de l'ancienne valeur", []Op{w("A", 1, 0, 10), r("B", 0, 1, 2), r("C", 1, 3, 4)}},
		{"écritures concurrentes, ordre inversé", []Op{w("A", 1, 0, 5), w("B", 2, 1, 6), r("C", 1, 7, 8), r("D", 1, 9, 10)}},
		{"compare-and-set : un seul gagnant", []Op{cas("A", 0, 2, true, 0, 2), cas("B", 0, 3, false, 1, 3), r("C", 2, 4, 5)}},
		{"le perdant voit 2, puis écrit", []Op{cas("A", 0, 2, true, 0, 2), cas("B", 2, 5, true, 1, 6), r("C", 5, 7, 8)}},
	}
	for _, c := range cases {
		order, err := Linearize(0, c.h)
		if err != nil {
			t.Errorf("%s : Linearize = %v, attendu un ordre — cherche parmi TOUS les ordres compatibles avec le temps réel", c.name, err)
			continue
		}
		valid(t, 0, c.h, order)
	}
}

func TestM2NotLinearizable(t *testing.T) {
	cases := []struct {
		name string
		h    []Op
	}{
		{"lecture obsolète après une écriture terminée", []Op{w("A", 1, 0, 2), r("B", 0, 3, 4)}},
		{"retour en arrière : B voit 0 après que A a vu 1", []Op{w("W", 1, 0, 10), r("A", 1, 1, 2), r("B", 0, 3, 4)}},
		{"valeur jamais écrite", []Op{w("A", 1, 0, 1), r("B", 7, 2, 3)}},
		{"deux compare-and-set gagnants sur la même attente", []Op{cas("A", 0, 2, true, 0, 3), cas("B", 0, 3, true, 1, 4)}},
		{"lectures qui se contredisent", []Op{w("A", 1, 0, 5), w("B", 2, 1, 6), r("C", 1, 7, 8), r("D", 2, 9, 10), r("E", 1, 11, 12)}},
	}
	for _, c := range cases {
		order, err := Linearize(0, c.h)
		if !errors.Is(err, ErrNotLinearizable) {
			t.Errorf("%s : Linearize = %v, %v ; attendu ErrNotLinearizable", c.name, order, err)
		}
	}
}

func TestM2InitialAndBadOps(t *testing.T) {
	if _, err := Linearize(42, []Op{r("A", 42, 0, 1)}); err != nil {
		t.Errorf("le registre part de initial (42) : err = %v", err)
	}
	if order, err := Linearize(0, nil); err != nil || len(order) != 0 {
		t.Errorf("historique vide : %v, %v ; attendu un ordre vide et aucune erreur", order, err)
	}
	if _, err := Linearize(0, []Op{w("A", 1, 5, 5)}); !errors.Is(err, ErrBadOp) {
		t.Errorf("Start == End : err = %v, attendu ErrBadOp", err)
	}
	if _, err := Linearize(0, []Op{{Kind: OpKind(9), Start: 0, End: 1}}); !errors.Is(err, ErrBadOp) {
		t.Errorf("Kind inconnu : err = %v, attendu ErrBadOp", err)
	}
}

// ---------- Jalon 3 ----------

func TestM3SequencerNumbers(t *testing.T) {
	var s Sequencer
	for i := uint64(1); i <= 3; i++ {
		if m := s.Assign("n1", "x"); m.Seq != i || m.From != "n1" || m.Payload != "x" {
			t.Errorf("Assign n°%d = %+v, attendu Seq=%d — des numéros consécutifs à partir de 1", i, m, i)
		}
	}
}

func TestM3HoldBack(t *testing.T) {
	var s Sequencer
	m1, m2, m3 := s.Assign("a", "x"), s.Assign("b", "y"), s.Assign("c", "z")
	rep := NewReplica()
	if got := rep.Receive(m3); len(got) != 0 {
		t.Errorf("message 3 reçu avant 1 et 2 : livré %v, attendu rien — un trou bloque la livraison", got)
	}
	if got := rep.Receive(m1); !reflect.DeepEqual(got, []Message{m1}) {
		t.Errorf("message 1 reçu : livré %v, attendu [m1] seul (2 manque encore)", got)
	}
	if got := rep.Receive(m2); !reflect.DeepEqual(got, []Message{m2, m3}) {
		t.Errorf("message 2 reçu : livré %v, attendu [m2 m3] — le trou est comblé", got)
	}
	if got := rep.Receive(m2); len(got) != 0 {
		t.Errorf("doublon du message 2 : livré %v, attendu rien", got)
	}
	if got := rep.Receive(Message{Seq: 0, Payload: "?"}); len(got) != 0 {
		t.Errorf("numéro 0 : livré %v, attendu rien (les numéros commencent à 1)", got)
	}
	if got := rep.Delivered(); !reflect.DeepEqual(got, []Message{m1, m2, m3}) {
		t.Errorf("Delivered = %v, attendu [m1 m2 m3]", got)
	}
	got := rep.Delivered()
	got[0].Payload = "modifié"
	if rep.Delivered()[0].Payload != "x" {
		t.Error("Delivered doit renvoyer une copie : l'appelant ne doit pas pouvoir réécrire le log")
	}
}

func TestM3SameOrderEverywhere(t *testing.T) {
	var s Sequencer
	claims := []Message{
		s.Assign("alice", "ada"), s.Assign("bob", "ada"), s.Assign("bob", "bob"),
		s.Assign("carol", "carol"), s.Assign("dave", "carol"), s.Assign("alice", "zoe"),
	}
	arrivals := [][]int{
		{0, 1, 2, 3, 4, 5},
		{5, 4, 3, 2, 1, 0},
		{1, 3, 5, 0, 2, 4},
		{2, 2, 0, 1, 1, 5, 3, 4, 0},
	}
	want := map[string]string{"ada": "alice", "bob": "bob", "carol": "carol", "zoe": "alice"}
	var first []Message
	for k, order := range arrivals {
		rep := NewReplica()
		for _, i := range order {
			rep.Receive(claims[i])
		}
		log := rep.Delivered()
		if k == 0 {
			first = log
		} else if !reflect.DeepEqual(log, first) {
			t.Errorf("réplique %d : log %v, différent de la réplique 0 — l'ordre de livraison ne doit pas dépendre de l'ordre d'arrivée", k, log)
		}
		if got := Owners(log); !reflect.DeepEqual(got, want) {
			t.Errorf("réplique %d : Owners = %v, attendu %v — le premier dans l'ordre total gagne le nom", k, got, want)
		}
	}
}
