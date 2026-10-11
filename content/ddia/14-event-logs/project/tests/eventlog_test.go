package lab

import (
	"errors"
	"fmt"
	"reflect"
	"testing"
)

func newLog(t *testing.T, n int) *Log {
	t.Helper()
	l, err := NewLog(n)
	if err != nil {
		t.Fatal(err)
	}
	return l
}

func mustAppend(t *testing.T, l *Log, key, value string) Message {
	t.Helper()
	m, err := l.Append(key, value)
	if err != nil {
		t.Fatalf("Append(%q, %q) : %v", key, value, err)
	}
	return m
}

// ---------- Jalon 1 ----------

func TestM1AppendOffsetsPerPartition(t *testing.T) {
	l := newLog(t, 4)
	next := map[int]int64{}
	for i := 0; i < 40; i++ {
		key := fmt.Sprintf("user-%d", i%7)
		m := mustAppend(t, l, key, fmt.Sprint(i))
		p := l.PartitionFor(key)
		if m.Partition != p {
			t.Fatalf("Append(%q) en partition %d, attendu %d — la partition se choisit par la clé", key, m.Partition, p)
		}
		if m.Offset != next[p] {
			t.Fatalf("Append(%q) : offset %d, attendu %d — les offsets se suivent à l'intérieur de CHAQUE partition", key, m.Offset, next[p])
		}
		if m.Key != key || m.Value != fmt.Sprint(i) || m.Tombstone {
			t.Fatalf("Append renvoie %+v — clé, valeur et Tombstone=false attendus", m)
		}
		next[p]++
	}
	for p := 0; p < 4; p++ {
		if end, err := l.EndOffset(p); err != nil || end != next[p] {
			t.Errorf("EndOffset(%d) = %d, %v ; attendu %d", p, end, err, next[p])
		}
	}
}

func TestM1SameKeyStaysOrdered(t *testing.T) {
	l := newLog(t, 3)
	for i := 0; i < 5; i++ {
		mustAppend(t, l, "cart-42", fmt.Sprint(i))
	}
	got, err := l.Read(l.PartitionFor("cart-42"), 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	var vals []string
	for _, m := range got {
		if m.Key == "cart-42" {
			vals = append(vals, m.Value)
		}
	}
	if !reflect.DeepEqual(vals, []string{"0", "1", "2", "3", "4"}) {
		t.Errorf("les événements d'une même clé doivent être lus dans l'ordre d'écriture : %v", vals)
	}
}

func TestM1ReadWindowAndErrors(t *testing.T) {
	l := newLog(t, 1)
	for i := 0; i < 6; i++ {
		mustAppend(t, l, fmt.Sprintf("k%d", i), "v")
	}
	got, err := l.Read(0, 2, 3)
	if err != nil || len(got) != 3 || got[0].Offset != 2 || got[2].Offset != 4 {
		t.Errorf("Read(0, 2, 3) = %v, %v ; attendu les offsets 2, 3, 4", got, err)
	}
	if all, _ := l.Read(0, 0, 0); len(all) != 6 {
		t.Errorf("Read avec max <= 0 doit tout renvoyer : %d messages", len(all))
	}
	if end, err := l.Read(0, 6, 10); err != nil || end == nil || len(end) != 0 {
		t.Errorf("Read à la fin du log = %v, %v ; attendu une slice vide non nil (rien de nouveau, ce n'est pas une erreur)", end, err)
	}
	if _, err := l.Read(0, 7, 1); !errors.Is(err, ErrOffsetOutOfRange) {
		t.Errorf("Read au-delà de la fin : err = %v, attendu ErrOffsetOutOfRange", err)
	}
	if _, err := l.Read(0, -1, 1); !errors.Is(err, ErrOffsetOutOfRange) {
		t.Errorf("offset négatif : err = %v, attendu ErrOffsetOutOfRange", err)
	}
	if _, err := l.Read(1, 0, 1); !errors.Is(err, ErrNoPartition) {
		t.Errorf("partition 1 sur un log d'une partition : err = %v, attendu ErrNoPartition", err)
	}
	if _, err := l.EndOffset(-1); !errors.Is(err, ErrNoPartition) {
		t.Errorf("EndOffset(-1) : err = %v, attendu ErrNoPartition", err)
	}
	if _, err := l.Append("", "x"); !errors.Is(err, ErrEmptyKey) {
		t.Errorf("clé vide : err = %v, attendu ErrEmptyKey", err)
	}
}

func TestM1ReadIsACopyAndDeleteIsTombstone(t *testing.T) {
	l := newLog(t, 1)
	mustAppend(t, l, "a", "1")
	got, _ := l.Read(0, 0, 0)
	if len(got) == 1 {
		got[0].Value = "pirate"
	}
	again, _ := l.Read(0, 0, 0)
	if len(again) != 1 || again[0].Value != "1" {
		t.Errorf("modifier le résultat de Read ne doit pas modifier le log : %v", again)
	}
	m, err := l.Delete("a")
	if err != nil || !m.Tombstone || m.Offset != 1 || m.Key != "a" {
		t.Errorf("Delete(\"a\") = %+v, %v ; attendu une tombstone à l'offset 1", m, err)
	}
}

// ---------- Jalon 2 ----------

func TestM2CommitPollAndLag(t *testing.T) {
	l := newLog(t, 1)
	for i := 0; i < 10; i++ {
		mustAppend(t, l, fmt.Sprintf("k%d", i), fmt.Sprint(i))
	}
	if c := l.Committed("billing", 0); c != 0 {
		t.Errorf("un groupe neuf commence à l'offset 0, pas %d", c)
	}
	first, _ := l.Poll("billing", 0, 4)
	again, _ := l.Poll("billing", 0, 4)
	if len(first) != 4 || !reflect.DeepEqual(first, again) {
		t.Errorf("Poll ne doit pas avancer tout seul : %v puis %v — c'est Commit qui avance", first, again)
	}
	if err := l.Commit("billing", 0, 4); err != nil {
		t.Fatal(err)
	}
	next, _ := l.Poll("billing", 0, 2)
	if len(next) != 2 || next[0].Offset != 4 {
		t.Errorf("après Commit(4), Poll doit reprendre à l'offset 4 : %v", next)
	}
	if lag, err := l.Lag("billing", 0); err != nil || lag != 6 {
		t.Errorf("Lag = %d, %v ; attendu 10 − 4 = 6", lag, err)
	}
	if lag, _ := l.Lag("email", 0); lag != 10 {
		t.Errorf("un autre groupe a sa propre position : Lag(email) = %d, attendu 10", lag)
	}
}

func TestM2CommitErrorsAndReplay(t *testing.T) {
	l := newLog(t, 2)
	if err := l.Commit("g", 0, 1); !errors.Is(err, ErrOffsetOutOfRange) {
		t.Errorf("valider au-delà de la fin du log : err = %v, attendu ErrOffsetOutOfRange", err)
	}
	if err := l.Commit("g", 5, 0); !errors.Is(err, ErrNoPartition) {
		t.Errorf("partition 5 : err = %v, attendu ErrNoPartition", err)
	}
	if _, err := l.Lag("g", 9); !errors.Is(err, ErrNoPartition) {
		t.Errorf("Lag sur la partition 9 : err = %v, attendu ErrNoPartition", err)
	}
	p := l.PartitionFor("x")
	for i := 0; i < 3; i++ {
		mustAppend(t, l, "x", fmt.Sprint(i))
	}
	if err := l.Commit("g", p, 3); err != nil {
		t.Fatal(err)
	}
	if err := l.Commit("g", p, 0); err != nil {
		t.Fatalf("revenir à l'offset 0 doit être permis : c'est le rejeu (%v)", err)
	}
	if got, _ := l.Poll("g", p, 0); len(got) != 3 {
		t.Errorf("après un retour à l'offset 0, tout doit être relu : %d messages", len(got))
	}
}

func TestM2Assign(t *testing.T) {
	cases := []struct {
		parts     int
		consumers []string
		want      map[string][]int
	}{
		{4, []string{"b", "a"}, map[string][]int{"a": {0, 2}, "b": {1, 3}}},
		{3, []string{"c1", "c2", "c3", "c4", "c5"}, map[string][]int{"c1": {0}, "c2": {1}, "c3": {2}, "c4": {}, "c5": {}}},
		{5, []string{"solo"}, map[string][]int{"solo": {0, 1, 2, 3, 4}}},
		{4, nil, map[string][]int{}},
	}
	for _, c := range cases {
		in := append([]string(nil), c.consumers...)
		got := Assign(c.parts, in)
		if got == nil || !reflect.DeepEqual(got, c.want) {
			t.Errorf("Assign(%d, %v) = %v, attendu %v — au-delà du nombre de partitions, un consommateur reste inactif (slice vide non nil)", c.parts, c.consumers, got, c.want)
		}
		if !reflect.DeepEqual(in, c.consumers) {
			t.Errorf("Assign ne doit pas trier la slice de l'appelant : %v", in)
		}
	}
}

// ---------- Jalon 3 ----------

func compactFixture(t *testing.T) *Log {
	l := newLog(t, 1)
	for _, kv := range [][2]string{{"a", "1"}, {"b", "2"}, {"a", "3"}, {"c", "4"}} {
		mustAppend(t, l, kv[0], kv[1])
	}
	if _, err := l.Delete("b"); err != nil {
		t.Fatal(err)
	}
	mustAppend(t, l, "a", "5")
	mustAppend(t, l, "d", "6")
	mustAppend(t, l, "c", "7")
	return l
}

func offsets(ms []Message) []int64 {
	out := []int64{}
	for _, m := range ms {
		out = append(out, m.Offset)
	}
	return out
}

func TestM3CompactKeepsLastPerKey(t *testing.T) {
	l := compactFixture(t)
	if err := l.Compact(0, false); err != nil {
		t.Fatal(err)
	}
	got, _ := l.Read(0, 0, 0)
	if want := []int64{4, 5, 6, 7}; !reflect.DeepEqual(offsets(got), want) {
		t.Errorf("après compaction, offsets %v, attendu %v — le dernier message de chaque clé, tombstone comprise, à son offset d'origine", offsets(got), want)
	}
	if end, _ := l.EndOffset(0); end != 8 {
		t.Errorf("la compaction ne doit pas changer la fin du log : %d, attendu 8", end)
	}
	if from2, _ := l.Read(0, 2, 1); len(from2) != 1 || from2[0].Offset != 4 {
		t.Errorf("Read depuis l'offset 2 (supprimé) doit commencer au message suivant, l'offset 4 : %v", from2)
	}
	if err := l.Compact(0, true); err != nil {
		t.Fatal(err)
	}
	got, _ = l.Read(0, 0, 0)
	if want := []int64{5, 6, 7}; !reflect.DeepEqual(offsets(got), want) {
		t.Errorf("avec dropTombstones, la clé b doit disparaître : offsets %v, attendu %v", offsets(got), want)
	}
	if err := l.Compact(3, false); !errors.Is(err, ErrNoPartition) {
		t.Errorf("Compact(3) : err = %v, attendu ErrNoPartition", err)
	}
}

func TestM3CatchUpBuildsView(t *testing.T) {
	l := compactFixture(t)
	view := map[string]string{}
	n, err := l.CatchUp("search", view)
	if err != nil || n != 8 {
		t.Fatalf("CatchUp = %d, %v ; attendu 8 messages appliqués", n, err)
	}
	want := map[string]string{"a": "5", "c": "7", "d": "6"}
	if !reflect.DeepEqual(view, want) {
		t.Errorf("vue = %v, attendu %v — une tombstone supprime la clé", view, want)
	}
	if lag, _ := l.Lag("search", 0); lag != 0 {
		t.Errorf("après CatchUp, le groupe doit avoir validé la fin du log : retard %d", lag)
	}
	mustAppend(t, l, "e", "8")
	if _, err := l.Delete("a"); err != nil {
		t.Fatal(err)
	}
	if n, _ := l.CatchUp("search", view); n != 2 {
		t.Errorf("le second CatchUp ne doit appliquer que les 2 nouveaux messages, pas %d", n)
	}
	if want := map[string]string{"c": "7", "d": "6", "e": "8"}; !reflect.DeepEqual(view, want) {
		t.Errorf("vue incrémentale = %v, attendu %v", view, want)
	}
}

func TestM3RebuildFromCompactedLog(t *testing.T) {
	l := newLog(t, 4)
	for i := 0; i < 200; i++ {
		key := fmt.Sprintf("listing-%d", i%25)
		if i%9 == 0 {
			if _, err := l.Delete(key); err != nil {
				t.Fatal(err)
			}
			continue
		}
		mustAppend(t, l, key, fmt.Sprint(i))
	}
	before := map[string]string{}
	if _, err := l.CatchUp("old-index", before); err != nil {
		t.Fatal(err)
	}
	total := 0
	for p := 0; p < 4; p++ {
		if err := l.Compact(p, true); err != nil {
			t.Fatal(err)
		}
		ms, _ := l.Read(p, 0, 0)
		total += len(ms)
	}
	if total != len(before) {
		t.Errorf("après compaction et purge des tombstones, il doit rester une entrée par clé vivante : %d messages pour %d clés", total, len(before))
	}
	rebuilt := map[string]string{}
	if _, err := l.CatchUp("new-index", rebuilt); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(rebuilt, before) {
		t.Errorf("un nouvel index relu depuis l'offset 0 du log compacté doit retrouver la même vue :\n%v\nattendu\n%v", rebuilt, before)
	}
	for p := 0; p < 4; p++ {
		if lag, _ := l.Lag("old-index", p); lag != 0 {
			t.Errorf("la compaction ne doit pas créer de retard pour un groupe à jour (partition %d : %d)", p, lag)
		}
	}
}
