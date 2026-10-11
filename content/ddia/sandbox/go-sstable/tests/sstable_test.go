package lab

import (
	"fmt"
	"reflect"
	"testing"
)

func e(k, v string) Entry { return Entry{Key: k, Value: v} }
func del(k string) Entry  { return Entry{Key: k, Deleted: true} }

func TestMergeNewestWins(t *testing.T) {
	oldest := []Entry{e("a", "1"), e("c", "1"), e("e", "1")}
	middle := []Entry{e("b", "2"), e("c", "2")}
	newest := []Entry{e("c", "3"), e("f", "3")}
	got := Merge([][]Entry{oldest, middle, newest}, false)
	want := []Entry{e("a", "1"), e("b", "2"), e("c", "3"), e("e", "1"), e("f", "3")}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Merge = %v\n  attendu %v — la version du segment le plus récent gagne, une entrée par clé", got, want)
	}
}

func TestMergeTombstones(t *testing.T) {
	older := []Entry{e("a", "1"), e("b", "1"), e("c", "1")}
	newer := []Entry{del("b"), e("d", "2")}
	if got := Merge([][]Entry{older, newer}, false); !reflect.DeepEqual(got, []Entry{e("a", "1"), del("b"), e("c", "1"), e("d", "2")}) {
		t.Errorf("tombstones conservées : %v", got)
	}
	if got := Merge([][]Entry{older, newer}, true); !reflect.DeepEqual(got, []Entry{e("a", "1"), e("c", "1"), e("d", "2")}) {
		t.Errorf("tombstones retirées : %v", got)
	}
	// une valeur plus récente que la pierre tombale la remplace
	revived := []Entry{e("b", "9")}
	if got := Merge([][]Entry{older, newer, revived}, true); !reflect.DeepEqual(got, []Entry{e("a", "1"), e("b", "9"), e("c", "1"), e("d", "2")}) {
		t.Errorf("clé ressuscitée : %v", got)
	}
}

func TestMergeEdgeCases(t *testing.T) {
	if got := Merge(nil, true); got == nil || len(got) != 0 {
		t.Errorf("Merge(nil) = %#v, attendu une slice vide non nil", got)
	}
	if got := Merge([][]Entry{nil, {}}, false); len(got) != 0 {
		t.Errorf("segments vides : %v", got)
	}
	in := []Entry{e("a", "1")}
	got := Merge([][]Entry{in}, false)
	got[0].Value = "modifié"
	if in[0].Value != "1" {
		t.Error("Merge ne doit pas partager sa sortie avec l'entrée")
	}
}

func TestMergeScales(t *testing.T) {
	var segs [][]Entry
	for s := 0; s < 5; s++ {
		var seg []Entry
		for i := 0; i < 400; i++ {
			seg = append(seg, e(fmt.Sprintf("k%04d", i*(s+1)%1000), fmt.Sprint("seg", s)))
		}
		// trié et unique : on trie en insérant via map
		m := map[string]Entry{}
		for _, x := range seg {
			m[x.Key] = x
		}
		seg = seg[:0]
		for i := 0; i < 1000; i++ {
			if x, ok := m[fmt.Sprintf("k%04d", i)]; ok {
				seg = append(seg, x)
			}
		}
		segs = append(segs, seg)
	}
	got := Merge(segs, false)
	for i := 1; i < len(got); i++ {
		if got[i-1].Key >= got[i].Key {
			t.Fatalf("sortie non triée ou avec doublon : %v puis %v", got[i-1].Key, got[i].Key)
		}
	}
}

func table(n int) []Entry {
	var out []Entry
	for i := 0; i < n; i++ {
		out = append(out, e(fmt.Sprintf("k%05d", i*2), fmt.Sprint(i))) // clés paires seulement
	}
	return out
}

func TestSparseIndex(t *testing.T) {
	tbl := table(10)
	idx := BuildSparseIndex(tbl, 4)
	want := []IndexEntry{{"k00000", 0}, {"k00008", 4}, {"k00016", 8}}
	if !reflect.DeepEqual(idx, want) {
		t.Errorf("index = %v, attendu %v", idx, want)
	}
	if BuildSparseIndex(tbl, 0) != nil || BuildSparseIndex(nil, 4) != nil {
		t.Error("every < 1 ou table vide : nil")
	}
	if got := BuildSparseIndex(tbl, 100); len(got) != 1 {
		t.Errorf("every > taille : %v", got)
	}
}

func TestLookupScansOnlyOneBlock(t *testing.T) {
	tbl := table(1000)
	idx := BuildSparseIndex(tbl, 16)
	for i := 0; i < 1000; i++ {
		key := fmt.Sprintf("k%05d", i*2)
		got, ok, scanned := Lookup(tbl, idx, key)
		if !ok || got.Value != fmt.Sprint(i) {
			t.Fatalf("Lookup(%s) = %v, %v", key, got, ok)
		}
		if scanned > 16 {
			t.Fatalf("Lookup(%s) a examiné %d entrées, un bloc de 16 suffit", key, scanned)
		}
	}
}

func TestLookupAbsentKeys(t *testing.T) {
	tbl := table(100)
	idx := BuildSparseIndex(tbl, 8)
	for _, key := range []string{"a", "k00001", "k00099", "k00199", "k99999", "zzz"} {
		if _, ok, scanned := Lookup(tbl, idx, key); ok || scanned > 8 {
			t.Errorf("Lookup(%q) = %v, examinées %d", key, ok, scanned)
		}
	}
	if _, ok, scanned := Lookup(tbl, idx, "a"); ok || scanned != 0 {
		t.Errorf("clé avant la première : trouvée=%v, examinées=%d, attendu faux et 0", ok, scanned)
	}
	if _, ok, _ := Lookup(nil, nil, "x"); ok {
		t.Error("table vide")
	}
}

func TestLookupReturnsTombstone(t *testing.T) {
	tbl := []Entry{e("a", "1"), del("b"), e("c", "3")}
	idx := BuildSparseIndex(tbl, 2)
	got, ok, _ := Lookup(tbl, idx, "b")
	if !ok || !got.Deleted {
		t.Errorf("Lookup(b) = %v, %v : la pierre tombale doit être renvoyée pour que l'appelant arrête sa recherche", got, ok)
	}
}
