package lab

import (
	"fmt"
	"reflect"
	"testing"
)

func TestFlushesAtTheLimit(t *testing.T) {
	l := New(3)
	l.Put("a", "1")
	l.Put("b", "2")
	if l.Segments() != 0 {
		t.Fatalf("Segments = %d avant le seuil, attendu 0", l.Segments())
	}
	l.Put("a", "1bis") // même clé : la memtable ne grossit pas
	if l.Segments() != 0 {
		t.Fatalf("une mise à jour de clé existante ne doit pas compter dans le seuil (Segments = %d)", l.Segments())
	}
	l.Put("c", "3")
	if l.Segments() != 1 {
		t.Fatalf("Segments = %d, attendu 1 : la memtable atteint 3 clés distinctes et part en SSTable", l.Segments())
	}
	l.Put("d", "4")
	if l.Segments() != 1 {
		t.Errorf("la nouvelle memtable est vide : Segments = %d, attendu 1", l.Segments())
	}
	for k, want := range map[string]string{"a": "1bis", "b": "2", "c": "3", "d": "4"} {
		if v, ok := l.Get(k); !ok || v != want {
			t.Errorf("Get(%s) = %q, %v, attendu %q", k, v, ok, want)
		}
	}
}

func TestNewestVersionWins(t *testing.T) {
	l := New(2)
	l.Put("k", "v1")
	l.Put("x", "x1") // flush #1 : {k:v1, x:x1}
	l.Put("k", "v2")
	l.Put("y", "y1") // flush #2 : {k:v2, y:y1}
	l.Put("k", "v3") // reste en memtable
	if v, _ := l.Get("k"); v != "v3" {
		t.Errorf("la memtable est la plus récente : %q", v)
	}
	l.Put("z", "z1") // flush #3
	if v, _ := l.Get("k"); v != "v3" {
		t.Errorf("après flush : %q, attendu v3", v)
	}
	if v, _ := l.Get("x"); v != "x1" {
		t.Errorf("Get(x) = %q", v)
	}
}

func TestDeleteMasksOlderSegments(t *testing.T) {
	l := New(2)
	l.Put("a", "1")
	l.Put("b", "2") // flush
	l.Delete("a")
	if _, ok := l.Get("a"); ok {
		t.Error("a est supprimée dans la memtable : elle doit être masquée, même si un segment la contient")
	}
	l.Put("c", "3") // flush : le segment 2 contient la pierre tombale de a
	if _, ok := l.Get("a"); ok {
		t.Error("a doit rester supprimée après le flush de la pierre tombale")
	}
	if v, ok := l.Get("b"); !ok || v != "2" {
		t.Error("b doit rester lisible")
	}
	l.Put("a", "resurrected")
	if v, ok := l.Get("a"); !ok || v != "resurrected" {
		t.Errorf("une écriture plus récente que la pierre tombale la remplace : %q, %v", v, ok)
	}
}

func TestReadCostGrowsWithSegmentsUntilCompaction(t *testing.T) {
	l := New(2)
	for i := 0; i < 20; i++ {
		l.Put(fmt.Sprintf("k%02d", i), "v")
	}
	if l.Segments() != 10 {
		t.Fatalf("Segments = %d, attendu 10", l.Segments())
	}
	if _, ok := l.Get("absente"); ok || l.SegmentsConsulted() != 10 {
		t.Errorf("une clé absente oblige à consulter tous les segments : %d, attendu 10", l.SegmentsConsulted())
	}
	if _, ok := l.Get("k19"); !ok || l.SegmentsConsulted() != 1 {
		t.Errorf("la clé la plus récente se trouve dans le segment le plus récent : %d consultés, attendu 1", l.SegmentsConsulted())
	}
	if _, ok := l.Get("k00"); !ok || l.SegmentsConsulted() != 10 {
		t.Errorf("la clé la plus ancienne exige de remonter à tous les segments : %d, attendu 10", l.SegmentsConsulted())
	}
	l.Compact()
	if l.Segments() != 1 {
		t.Fatalf("après Compact : %d segments, attendu 1", l.Segments())
	}
	if _, ok := l.Get("absente"); ok || l.SegmentsConsulted() != 1 {
		t.Errorf("après compaction, une clé absente coûte 1 segment : %d", l.SegmentsConsulted())
	}
	for i := 0; i < 20; i++ {
		if _, ok := l.Get(fmt.Sprintf("k%02d", i)); !ok {
			t.Fatalf("k%02d perdue par la compaction", i)
		}
	}
}

func TestScan(t *testing.T) {
	l := New(3)
	for _, k := range []string{"e", "a", "c", "g", "b", "d", "f"} {
		l.Put(k, "v-"+k)
	}
	l.Put("c", "v-c2")
	l.Delete("d")
	got := l.Scan("b", "f")
	want := []KV{{"b", "v-b"}, {"c", "v-c2"}, {"e", "v-e"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Scan(b, f) = %v, attendu %v (d supprimée, c à jour)", got, want)
	}
	if all := l.Scan("", ""); len(all) != 6 || all[0].Key != "a" || all[5].Key != "g" {
		t.Errorf("Scan complet = %v", all)
	}
	if none := l.Scan("x", ""); none == nil || len(none) != 0 {
		t.Errorf("Scan sans résultat = %#v, attendu une slice vide non nil", none)
	}
}

func TestCompactDropsTombstonesAndOldVersions(t *testing.T) {
	l := New(2)
	l.Put("a", "1")
	l.Put("b", "1") // flush
	l.Put("a", "2")
	l.Delete("b") // flush
	l.Put("c", "1")
	l.Compact() // c reste en memtable
	if l.Segments() != 1 {
		t.Fatalf("Segments = %d", l.Segments())
	}
	if _, ok := l.Get("b"); ok {
		t.Error("b était supprimée")
	}
	if v, _ := l.Get("a"); v != "2" {
		t.Errorf("a = %q, attendu 2", v)
	}
	if v, ok := l.Get("c"); !ok || v != "1" {
		t.Error("la memtable ne doit pas être touchée par Compact")
	}
	if l.SegmentsConsulted() != 0 {
		t.Errorf("c vient de la memtable : %d segments consultés", l.SegmentsConsulted())
	}

	e := New(1)
	e.Put("x", "1")
	e.Delete("x")
	e.Compact()
	if e.Segments() != 0 {
		t.Errorf("plus aucune clé vivante : %d segments, attendu 0", e.Segments())
	}
	New(5).Compact() // sans segment : ne doit pas paniquer
}
