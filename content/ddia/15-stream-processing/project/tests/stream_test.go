package lab

import (
	"math"
	"reflect"
	"testing"
)

func TestM1Tumbling(t *testing.T) {
	cases := []struct {
		t, size int64
		want    Window
		why     string
	}{
		{42, 60, Window{0, 60}, "arrondis l'horodatage à la baisse au multiple de la taille"},
		{60, 60, Window{60, 120}, "la fenêtre est [début, fin) : 60 ouvre la fenêtre suivante"},
		{119, 60, Window{60, 120}, "119 est encore dans [60, 120)"},
		{0, 60, Window{0, 60}, "0 est le début de la première fenêtre"},
		{-30, 60, Window{-60, 0}, "en Go, -30/60 vaut 0 : il faut arrondir vers −∞"},
		{-60, 60, Window{-60, 0}, "-60 est pile sur une frontière"},
	}
	for _, c := range cases {
		if got := TumblingWindow(c.t, c.size); got != c.want {
			t.Errorf("TumblingWindow(%d, %d) = %v, attendu %v — %s", c.t, c.size, got, c.want, c.why)
		}
	}
}

func TestM1Hopping(t *testing.T) {
	cases := []struct {
		t, size, hop int64
		want         []Window
		why          string
	}{
		{330, 300, 60, []Window{{60, 360}, {120, 420}, {180, 480}, {240, 540}, {300, 600}},
			"un événement appartient à taille/pas = 5 fenêtres, triées par début"},
		{360, 300, 60, []Window{{120, 420}, {180, 480}, {240, 540}, {300, 600}, {360, 660}},
			"[60, 360) ne contient pas 360 (fin exclue)"},
		{95, 120, 60, []Window{{0, 120}, {60, 180}}, "2 fenêtres de 2 minutes au pas d'une minute"},
		{42, 60, 60, []Window{{0, 60}}, "pas = taille : c'est une fenêtre tumbling"},
		{-10, 120, 60, []Window{{-120, 0}, {-60, 60}}, "les temps négatifs s'arrondissent vers −∞"},
	}
	for _, c := range cases {
		got := HoppingWindows(c.t, c.size, c.hop)
		if !reflect.DeepEqual(got, c.want) {
			t.Errorf("HoppingWindows(%d, %d, %d) = %v, attendu %v — %s", c.t, c.size, c.hop, got, c.want, c.why)
		}
	}
	if got := HoppingWindows(10, 60, 0); got != nil {
		t.Errorf("HoppingWindows avec un pas nul = %v, attendu nil", got)
	}
}

func ev(key string, t, v int64) Event { return Event{Key: key, Time: t, Value: v} }

func TestM2WatermarkEmission(t *testing.T) {
	a := NewAggregator(60, 60, 10)
	if wm := a.Watermark(); wm != math.MinInt64 {
		t.Fatalf("Watermark() avant tout événement = %d, attendu math.MinInt64", wm)
	}
	steps := []struct {
		e    Event
		want []Result
		why  string
	}{
		{ev("a", 5, 1), nil, "le watermark (−5) n'a pas atteint 60"},
		{ev("b", 40, 2), nil, "watermark 30 < 60"},
		{ev("a", 65, 3), nil, "watermark 55 < 60 : la première minute peut encore recevoir des événements"},
		{ev("a", 50, 4), nil, "50 est en retard mais sa fenêtre est encore ouverte : il compte"},
		{ev("b", 71, 5), []Result{
			{Key: "a", Window: Window{0, 60}, Count: 2, Sum: 5},
			{Key: "b", Window: Window{0, 60}, Count: 1, Sum: 2},
		}, "watermark 61 ≥ 60 : [0, 60) est complète, une ligne par clé triée par clé"},
		{ev("a", 30, 100), nil, "30 < watermark : sa fenêtre est déjà émise, c'est un retardataire"},
	}
	for i, s := range steps {
		got := a.Add(s.e)
		if !reflect.DeepEqual(got, s.want) {
			t.Fatalf("étape %d, Add(%+v) = %+v, attendu %+v — %s", i+1, s.e, got, s.want, s.why)
		}
	}
	if wm := a.Watermark(); wm != 61 {
		t.Errorf("Watermark() = %d, attendu 61 (plus grand horodatage 71 − délai 10) — un retardataire ne fait pas reculer le watermark", wm)
	}
	if a.Late() != 1 {
		t.Errorf("Late() = %d, attendu 1 — compte à part l'événement écarté", a.Late())
	}
	rest := a.Flush()
	want := []Result{
		{Key: "a", Window: Window{60, 120}, Count: 1, Sum: 3},
		{Key: "b", Window: Window{60, 120}, Count: 1, Sum: 5},
	}
	if !reflect.DeepEqual(rest, want) {
		t.Errorf("Flush() = %+v, attendu %+v — le retardataire de valeur 100 ne doit apparaître nulle part", rest, want)
	}
	if again := a.Flush(); len(again) != 0 {
		t.Errorf("un second Flush() = %+v, attendu vide — une fenêtre n'est émise qu'une fois", again)
	}
}

func TestM2HoppingAggregation(t *testing.T) {
	a := NewAggregator(120, 60, 0)
	var got []Result
	for _, e := range []Event{ev("k", 10, 1), ev("k", 70, 2), ev("k", 130, 4)} {
		got = append(got, a.Add(e)...)
	}
	want := []Result{
		{Key: "k", Window: Window{-60, 60}, Count: 1, Sum: 1},
		{Key: "k", Window: Window{0, 120}, Count: 2, Sum: 3},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("émissions = %+v, attendu %+v — chaque événement compte dans 2 fenêtres, émises dans l'ordre de leur fin", got, want)
	}
	// 100 est en retard pour [0,120) mais [60,180) est encore ouverte : il compte, sans être un retardataire.
	if out := a.Add(ev("k", 100, 8)); out != nil {
		t.Fatalf("Add(100) = %+v, attendu nil", out)
	}
	if a.Late() != 0 {
		t.Errorf("Late() = %d, attendu 0 — un événement dont une fenêtre est encore ouverte n'est pas un retardataire", a.Late())
	}
	rest := a.Flush()
	want = []Result{
		{Key: "k", Window: Window{60, 180}, Count: 3, Sum: 14},
		{Key: "k", Window: Window{120, 240}, Count: 1, Sum: 4},
	}
	if !reflect.DeepEqual(rest, want) {
		t.Errorf("Flush() = %+v, attendu %+v", rest, want)
	}
}

func TestM2Deterministic(t *testing.T) {
	events := []Event{ev("x", 3, 1), ev("y", 8, 1), ev("x", 61, 1), ev("y", 2, 1), ev("x", 125, 1), ev("y", 59, 1), ev("x", 200, 1)}
	run := func() []Result {
		a := NewAggregator(60, 60, 5)
		var out []Result
		for _, e := range events {
			out = append(out, a.Add(e)...)
		}
		return append(out, a.Flush()...)
	}
	first := run()
	for i := 0; i < 5; i++ {
		if again := run(); !reflect.DeepEqual(first, again) {
			t.Fatalf("deux exécutions sur le même flux diffèrent :\n%+v\n%+v\n— trie les émissions (fin, début, clé), ne dépends pas de l'ordre d'une map", first, again)
		}
	}
}

func TestM3Sessionize(t *testing.T) {
	in := []Event{
		ev("lea", 900, 1), ev("tom", 0, 1), ev("lea", 0, 1), ev("lea", 600, 1),
		ev("lea", 2100, 1), ev("lea", 4800, 1), ev("lea", 5400, 1), ev("tom", 1800, 1),
	}
	orig := append([]Event(nil), in...)
	got := Sessionize(in, 1800)
	want := []Session{
		{Key: "lea", Start: 0, End: 3900, Count: 4},
		{Key: "lea", Start: 4800, End: 7200, Count: 2},
		{Key: "tom", Start: 0, End: 1800, Count: 1},
		{Key: "tom", Start: 1800, End: 3600, Count: 1},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Sessionize = %+v\nattendu %+v\n— trie par clé puis par temps ; un écart ≥ gap ouvre une session ; End = dernier + gap", got, want)
	}
	if !reflect.DeepEqual(in, orig) {
		t.Errorf("Sessionize a modifié la slice d'entrée — travaille sur une copie")
	}
	if got := Sessionize(nil, 60); len(got) != 0 {
		t.Errorf("Sessionize(nil) = %+v, attendu aucune session", got)
	}
}

func rec(p int, off int64, key string, v int64) Record {
	return Record{Partition: p, Offset: off, Event: ev(key, off, v)}
}

func TestM3IdempotentConsumer(t *testing.T) {
	log := []Record{
		rec(0, 0, "m42", 10), rec(1, 0, "m7", 5), rec(0, 1, "m42", 20), rec(0, 2, "m42", 30),
		rec(1, 1, "m42", 1), rec(0, 3, "m42", 40), rec(1, 2, "m7", 6), rec(0, 4, "m42", 50),
	}
	c := NewConsumer()
	if c.ResumeOffset(0) != 0 {
		t.Fatalf("ResumeOffset(0) d'un consommateur neuf = %d, attendu 0", c.ResumeOffset(0))
	}
	for _, r := range log[:4] {
		if !c.Apply(r) {
			t.Fatalf("Apply(%+v) = false, attendu true pour un message jamais vu", r)
		}
	}
	cp := c.Checkpoint()
	for _, r := range log[4:6] {
		c.Apply(r)
	}
	if cp.Totals["m42"] != 60 || cp.Offsets[0] != 2 {
		t.Fatalf("le checkpoint a changé après coup (Totals=%v, Offsets=%v) — Checkpoint doit copier les maps", cp.Totals, cp.Offsets)
	}

	// Panne : l'état en mémoire est perdu. On repart du checkpoint, et le broker
	// relivre tout depuis le début (offset validé en retard).
	c2 := Restore(cp)
	if c2.ResumeOffset(0) != 3 || c2.ResumeOffset(1) != 1 {
		t.Errorf("ResumeOffset après Restore = (%d, %d), attendu (3, 1)", c2.ResumeOffset(0), c2.ResumeOffset(1))
	}
	applied := 0
	for _, r := range log {
		if c2.Apply(r) {
			applied++
		}
	}
	if applied != 4 {
		t.Errorf("%d messages appliqués au rejeu, attendu 4 — ignore tout offset ≤ au dernier appliqué de sa partition", applied)
	}
	if got := c2.Total("m42"); got != 151 {
		t.Errorf("Total(m42) = %d, attendu 151 (chaque paiement une seule fois)", got)
	}
	if got := c2.Total("m7"); got != 11 {
		t.Errorf("Total(m7) = %d, attendu 11 — les offsets se suivent par partition, pas globalement", got)
	}
	if c2.Apply(rec(0, 4, "m42", 50)) {
		t.Errorf("rejouer l'offset 4 de la partition 0 une fois de plus doit être ignoré")
	}

	cp.Totals["m42"] = -1
	if c2.Total("m42") != 151 {
		t.Errorf("modifier le checkpoint après Restore a changé le consommateur — Restore doit copier les maps")
	}
	if c3 := Restore(Checkpoint{}); !c3.Apply(rec(5, 0, "z", 1)) || c3.Total("z") != 1 {
		t.Errorf("Restore(Checkpoint{}) doit donner un consommateur utilisable (maps nil acceptées)")
	}
}
