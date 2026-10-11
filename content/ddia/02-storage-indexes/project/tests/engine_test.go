package lab

import (
	"errors"
	"fmt"
	"testing"
)

// ---------- Jalon 1 ----------

func TestM1SetGetDeleteAndReopen(t *testing.T) {
	dir := Dir{}
	db, dropped, err := Open(dir, Options{})
	if err != nil || dropped != 0 {
		t.Fatalf("Open = %v, %d", err, dropped)
	}
	if _, ok := dir[segName(1)]; !ok {
		t.Fatal("Open doit créer le segment 1")
	}
	db.Set("a", "1")
	db.Set("b", "2")
	db.Set("a", "3")
	if !db.Delete("b") || db.Delete("b") || db.Delete("zzz") {
		t.Error("Delete doit renvoyer true seulement pour une clé vivante")
	}
	if v, ok := db.Get("a"); !ok || v != "3" {
		t.Errorf("Get(a) = %q, %v", v, ok)
	}

	re, dropped, err := Open(dir, Options{})
	if err != nil || dropped != 0 {
		t.Fatalf("réouverture : %v, %d", err, dropped)
	}
	if v, ok := re.Get("a"); !ok || v != "3" {
		t.Errorf("après reprise Get(a) = %q, %v", v, ok)
	}
	if _, ok := re.Get("b"); ok {
		t.Error("b supprimée doit le rester après reprise (pierre tombale rejouée)")
	}
}

func TestM1TornTailOfTheActiveSegment(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{})
	db.Set("a", "premier")
	good := len(dir[segName(1)])
	db.Set("b", "second enregistrement")
	full := append([]byte(nil), dir[segName(1)]...)

	for cut := good + 1; cut < len(full); cut++ {
		d2 := Dir{segName(1): append([]byte(nil), full[:cut]...)}
		re, dropped, err := Open(d2, Options{})
		if err != nil {
			t.Fatalf("coupure %d : %v", cut, err)
		}
		if dropped != cut-good || len(d2[segName(1)]) != good {
			t.Fatalf("coupure %d : %d octets retirés, taille %d, attendu %d et %d", cut, dropped, len(d2[segName(1)]), cut-good, good)
		}
		if v, ok := re.Get("a"); !ok || v != "premier" {
			t.Fatalf("coupure %d : a perdue", cut)
		}
		if _, ok := re.Get("b"); ok {
			t.Fatalf("coupure %d : b ne doit pas être lue", cut)
		}
		re.Set("c", "après")
		if again, _, err := Open(d2, Options{}); err != nil {
			t.Fatalf("log illisible après reprise : %v", err)
		} else if v, _ := again.Get("c"); v != "après" {
			t.Fatalf("écriture après reprise perdue")
		}
	}
}

// ---------- Jalon 2 ----------

func fill(db *DB, n int) {
	for i := 0; i < n; i++ {
		db.Set(fmt.Sprintf("key%03d", i%20), fmt.Sprintf("valeur-%d", i))
	}
}

func TestM2RotationCreatesSegments(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 100})
	fill(db, 60)
	st := db.Stats()
	if st.Segments < 5 {
		t.Fatalf("Segments = %d : avec 100 octets maximum par segment, 60 écritures doivent en produire beaucoup", st.Segments)
	}
	if st.LiveKeys != 20 {
		t.Errorf("LiveKeys = %d, attendu 20", st.LiveKeys)
	}
	for k := 0; k < 20; k++ {
		key := fmt.Sprintf("key%03d", k)
		want := fmt.Sprintf("valeur-%d", 40+k)
		if v, ok := db.Get(key); !ok || v != want {
			t.Fatalf("Get(%s) = %q, %v, attendu %q (la valeur la plus récente, quel que soit le segment)", key, v, ok, want)
		}
	}
	// Tous les segments sauf le dernier ont dépassé le seuil ; le segment actif est le plus récent.
	for id := 1; id < st.Segments; id++ {
		if len(dir[segName(id)]) < 100 {
			t.Errorf("le segment fermé %d ne fait que %d octets", id, len(dir[segName(id)]))
		}
	}
}

func TestM2ReopenAcrossSegments(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 100})
	fill(db, 60)
	db.Delete("key005")
	re, _, err := Open(dir, Options{MaxSegmentBytes: 100})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := re.Get("key005"); ok {
		t.Error("key005 supprimée doit le rester")
	}
	if v, ok := re.Get("key019"); !ok || v != "valeur-59" {
		t.Errorf("key019 = %q, %v", v, ok)
	}
	if re.Stats().LiveKeys != 19 {
		t.Errorf("LiveKeys = %d", re.Stats().LiveKeys)
	}
	re.Set("nouvelle", "x") // l'écriture continue dans le segment actif existant
	if v, _ := re.Get("nouvelle"); v != "x" {
		t.Error("écriture après réouverture")
	}
}

func TestM2CorruptClosedSegment(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 100})
	fill(db, 40)
	dir[segName(1)][headerSize+2] ^= 0xff
	if _, _, err := Open(dir, Options{MaxSegmentBytes: 100}); !errors.Is(err, ErrCorrupt) {
		t.Errorf("segment fermé corrompu : err = %v, attendu ErrCorrupt (seule la fin du segment actif peut être tronquée)", err)
	}
}

// ---------- Jalon 3 ----------

func TestM3CompactShrinksDisk(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 100})
	fill(db, 200) // 20 clés réécrites 10 fois
	db.Delete("key000")
	before := db.Stats()
	merged := db.Compact()
	after := db.Stats()
	if merged < 2 {
		t.Fatalf("Compact a fusionné %d segments", merged)
	}
	if after.Segments != 2 {
		t.Errorf("Segments = %d, attendu 2 (le segment fusionné et l'actif)", after.Segments)
	}
	if after.DiskBytes >= before.DiskBytes/2 {
		t.Errorf("la compaction doit récupérer l'espace des anciennes versions : %d → %d octets", before.DiskBytes, after.DiskBytes)
	}
	if after.LiveKeys != before.LiveKeys {
		t.Errorf("LiveKeys %d → %d", before.LiveKeys, after.LiveKeys)
	}
	for i := 1; i < 20; i++ {
		key := fmt.Sprintf("key%03d", i)
		want := fmt.Sprintf("valeur-%d", 180+i)
		if v, ok := db.Get(key); !ok || v != want {
			t.Fatalf("après Compact Get(%s) = %q, %v, attendu %q", key, v, ok, want)
		}
	}
	if _, ok := db.Get("key000"); ok {
		t.Error("key000 supprimée ne doit pas revenir")
	}
}

func TestM3CompactSurvivesReopenAndKeepsWriting(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 100})
	fill(db, 100)
	db.Delete("key001")
	db.Compact()
	db.Set("key001", "ressuscitée") // plus récent que la pierre tombale supprimée par la compaction
	db.Set("neuve", "1")
	re, _, err := Open(dir, Options{MaxSegmentBytes: 100})
	if err != nil {
		t.Fatal(err)
	}
	if v, ok := re.Get("key001"); !ok || v != "ressuscitée" {
		t.Errorf("key001 = %q, %v", v, ok)
	}
	if v, ok := re.Get("key019"); !ok || v != "valeur-99" {
		t.Errorf("key019 = %q, %v", v, ok)
	}
	if re.Stats().LiveKeys != 21 {
		t.Errorf("LiveKeys = %d, attendu 21", re.Stats().LiveKeys)
	}
}

func TestM3TombstoneInActiveSegmentStillMasksCompactedValue(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 100})
	fill(db, 60)
	db.Compact()
	db.Delete("key003") // pierre tombale dans le segment actif, valeur dans le segment fusionné
	re, _, _ := Open(dir, Options{MaxSegmentBytes: 100})
	if _, ok := re.Get("key003"); ok {
		t.Error("key003 doit rester supprimée à la réouverture")
	}
}

func TestM3CompactNeedsTwoClosedSegments(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 1 << 20})
	db.Set("a", "1")
	if db.Compact() != 0 || len(dir) != 1 {
		t.Error("avec un seul segment (actif), Compact ne fait rien")
	}
	small, _, _ := Open(Dir{}, Options{MaxSegmentBytes: 100})
	fill(small, 60)
	small.Compact()
	if n := small.Compact(); n != 0 {
		t.Errorf("seconde compaction = %d, attendu 0 : il ne reste qu'un segment fermé", n)
	}
}

func TestM3EverythingDeleted(t *testing.T) {
	dir := Dir{}
	db, _, _ := Open(dir, Options{MaxSegmentBytes: 60})
	for i := 0; i < 10; i++ {
		db.Set(fmt.Sprint("k", i), "v")
	}
	for i := 0; i < 10; i++ {
		db.Delete(fmt.Sprint("k", i))
	}
	db.Compact()
	if db.Stats().LiveKeys != 0 {
		t.Error("plus aucune clé vivante")
	}
	if _, _, err := Open(dir, Options{MaxSegmentBytes: 60}); err != nil {
		t.Errorf("réouverture après compaction vide : %v", err)
	}
}
