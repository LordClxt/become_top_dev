package lab

import (
	"math"
	"testing"
)

func TestBTreeWriteAmp(t *testing.T) {
	if got := BTreeWriteAmp(100, 4096); math.Abs(got-41.96) > 1e-9 {
		t.Errorf("BTreeWriteAmp(100, 4096) = %v, attendu 41,96 ((100 + 4096) / 100)", got)
	}
	if got := BTreeWriteAmp(4096, 4096); got != 2 {
		t.Errorf("un enregistrement de la taille d'une page : %v, attendu 2 (WAL + page)", got)
	}
	if BTreeWriteAmp(0, 4096) != 0 || BTreeWriteAmp(-5, 4096) != 0 {
		t.Error("recordSize <= 0 doit renvoyer 0")
	}
}

func TestMaxLevels(t *testing.T) {
	cases := []struct{ n, b, want int }{{1, 500, 1}, {500, 500, 1}, {501, 500, 2}, {250_000, 500, 2}, {250_001, 500, 3}, {1_000_000, 2, 20}, {10, 1, 0}}
	for _, c := range cases {
		if got := MaxLevels(c.n, c.b); got != c.want {
			t.Errorf("MaxLevels(%d, %d) = %d, attendu %d", c.n, c.b, got, c.want)
		}
	}
}

func TestCapacityBytes(t *testing.T) {
	// L'exemple du livre : 4 niveaux de pages de 4 Ko, facteur de branchement 500 → environ 256 To.
	got := CapacityBytes(4, 500, 4096)
	if got != 256_000_000_000_000 && got != 256_000_000_000_000+0 {
		if math.Abs(float64(got)-2.56e14) > 1e11 {
			t.Errorf("CapacityBytes(4, 500, 4096) = %d, attendu ≈ 2,56e14 (256 To)", got)
		}
	}
	if CapacityBytes(0, 500, 4096) != 4096 {
		t.Errorf("0 niveau : une page, soit 4096 octets, obtenu %d", CapacityBytes(0, 500, 4096))
	}
}

func TestSimulateSizeTiered(t *testing.T) {
	r := SimulateSizeTiered(1, 16, 4)
	if r.UserBytes != 16 || r.TotalWritten != 64 || r.Segments != 1 || r.Amp != 4 {
		t.Errorf("16 flushes, fanIn 4 : %+v, attendu 16 octets utiles, 64 écrits (WAL 16 + flush 16 + 4 fusions de 4 + 1 fusion de 16), 1 segment, amp 4", r)
	}
	r = SimulateSizeTiered(1, 3, 4)
	if r.TotalWritten != 6 || r.Segments != 3 || r.Amp != 2 {
		t.Errorf("3 flushes, fanIn 4 (aucune fusion) : %+v, attendu 6 écrits, 3 segments, amp 2", r)
	}
	r = SimulateSizeTiered(1, 5, 4)
	if r.TotalWritten != 2*5+4 || r.Segments != 2 {
		t.Errorf("5 flushes, fanIn 4 : %+v, attendu 14 écrits (WAL 5 + flush 5 + 1 fusion de 4) et 2 segments", r)
	}
	r = SimulateSizeTiered(1000, 64, 4)
	if r.UserBytes != 64000 || r.TotalWritten != 64000*5 || r.Segments != 1 {
		t.Errorf("64 flushes de 1000 octets, fanIn 4 (3 niveaux de fusion) : %+v, attendu amp = 2 + 3 = 5", r)
	}
	if r := SimulateSizeTiered(0, 10, 4); r != (Result{}) {
		t.Errorf("flushBytes nul : %+v", r)
	}
	if r := SimulateSizeTiered(10, 10, 1); r != (Result{}) {
		t.Errorf("fanIn < 2 : %+v", r)
	}
}

func TestAmpGrowsLogarithmically(t *testing.T) {
	a := SimulateSizeTiered(1, 4*4*4, 4).Amp   // 3 niveaux de fusion
	b := SimulateSizeTiered(1, 4*4*4*4, 4).Amp // 4 niveaux
	if math.Abs(b-a-1) > 1e-9 {
		t.Errorf("multiplier le volume par fanIn ajoute une réécriture de chaque octet : %v puis %v", a, b)
	}
	// Un fanIn plus grand réduit le nombre de réécritures mais laisse plus de segments à consulter en lecture.
	small, large := SimulateSizeTiered(1, 256, 4), SimulateSizeTiered(1, 256, 16)
	if large.Amp >= small.Amp {
		t.Errorf("fanIn 16 (%v) doit amplifier moins que fanIn 4 (%v)", large.Amp, small.Amp)
	}
	if mid := SimulateSizeTiered(1, 255, 16); mid.Segments <= SimulateSizeTiered(1, 255, 4).Segments {
		t.Errorf("…mais laisser plus de segments (%d contre %d) : le compromis lecture/écriture", mid.Segments, SimulateSizeTiered(1, 255, 4).Segments)
	}
}
