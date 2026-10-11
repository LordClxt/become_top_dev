package lab

import (
	"errors"
	"math"
	"testing"
)

func TestPercentile(t *testing.T) {
	// 100 valeurs : 1..100
	s := make([]float64, 100)
	for i := range s {
		s[i] = float64(100 - i) // volontairement dans le désordre
	}
	tests := []struct {
		p    float64
		want float64
	}{{50, 50}, {95, 95}, {99, 99}, {100, 100}, {1, 1}}
	for _, tt := range tests {
		if got := Percentile(s, tt.p); got != tt.want {
			t.Errorf("Percentile(1..100, %v) = %v, attendu %v — rang = ceil(p/100 × n) dans la liste triée", tt.p, got, tt.want)
		}
	}
	if got := Percentile([]float64{7}, 99); got != 7 {
		t.Errorf("un seul échantillon : %v, attendu 7", got)
	}
	if got := Percentile(nil, 50); got != 0 {
		t.Errorf("sans échantillon : %v, attendu 0", got)
	}
}

func TestPercentileDoesNotMutate(t *testing.T) {
	s := []float64{3, 1, 2}
	Percentile(s, 50)
	if s[0] != 3 || s[1] != 1 || s[2] != 2 {
		t.Errorf("Percentile a trié la slice de l'appelant : %v — travaille sur une copie", s)
	}
}

func TestMeanHidesTheTail(t *testing.T) {
	// 98 requêtes à 100 ms, 2 à 5 s : la moyenne (198 ms) a l'air correcte, le p99 non.
	var s []float64
	for i := 0; i < 98; i++ {
		s = append(s, 100)
	}
	s = append(s, 5000, 5000)
	if got := Percentile(s, 50); got != 100 {
		t.Errorf("p50 = %v, attendu 100", got)
	}
	if got := Percentile(s, 99); got != 5000 {
		t.Errorf("p99 = %v, attendu 5000", got)
	}
}

func TestTailProbability(t *testing.T) {
	tests := []struct {
		p    float64
		n    int
		want float64
	}{{0.01, 1, 0.01}, {0.01, 10, 0.0956179}, {0.01, 100, 0.6339677}, {0.5, 0, 0}, {0, 50, 0}}
	for _, tt := range tests {
		if got := TailProbability(tt.p, tt.n); math.Abs(got-tt.want) > 1e-6 {
			t.Errorf("TailProbability(%v, %d) = %v, attendu %v — c'est 1 − (1 − p)^n", tt.p, tt.n, got, tt.want)
		}
	}
}

var bounds = []float64{10, 100, 1000}

func TestHistogramQuantile(t *testing.T) {
	h := NewHistogram(bounds)
	for i := 0; i < 90; i++ {
		h.Observe(5) // tranche ≤ 10
	}
	for i := 0; i < 9; i++ {
		h.Observe(100) // borne incluse : tranche ≤ 100
	}
	h.Observe(1500) // débordement
	if h.Count() != 100 {
		t.Fatalf("Count = %d, attendu 100", h.Count())
	}
	if got := h.Quantile(50); got != 10 {
		t.Errorf("p50 = %v, attendu 10", got)
	}
	if got := h.Quantile(99); got != 100 {
		t.Errorf("p99 = %v, attendu 100 (une valeur égale à la borne appartient à cette tranche)", got)
	}
	if got := h.Quantile(100); !math.IsInf(got, 1) {
		t.Errorf("p100 = %v, attendu +Inf (tranche de débordement)", got)
	}
	if got := NewHistogram(bounds).Quantile(50); got != 0 {
		t.Errorf("histogramme vide : %v, attendu 0", got)
	}
}

func TestMergeBeatsAveragingPercentiles(t *testing.T) {
	// Serveur A : 1 000 requêtes rapides. Serveur B : 10 requêtes lentes seulement.
	a, b := NewHistogram(bounds), NewHistogram(bounds)
	for i := 0; i < 1000; i++ {
		a.Observe(5)
	}
	for i := 0; i < 10; i++ {
		b.Observe(900)
	}
	avg := (a.Quantile(95) + b.Quantile(95)) / 2 // (10 + 1000) / 2 = 505 : n'a aucun sens
	if err := a.Merge(b); err != nil {
		t.Fatalf("Merge : %v", err)
	}
	if a.Count() != 1010 {
		t.Errorf("Count après fusion = %d, attendu 1010", a.Count())
	}
	if got := a.Quantile(95); got != 10 {
		t.Errorf("p95 de la fusion = %v, attendu 10 (la moyenne des p95, %v, est fausse)", got, avg)
	}
	if got := a.Quantile(100); got != 1000 {
		t.Errorf("p100 de la fusion = %v, attendu 1000", got)
	}
}

func TestMergeMismatch(t *testing.T) {
	a := NewHistogram([]float64{10, 100})
	b := NewHistogram([]float64{10, 200})
	b.Observe(1)
	if err := a.Merge(b); !errors.Is(err, ErrBoundsMismatch) {
		t.Errorf("Merge de tranches différentes : err = %v, attendu ErrBoundsMismatch", err)
	}
	if a.Count() != 0 {
		t.Errorf("Merge en échec a modifié l'histogramme (Count = %d)", a.Count())
	}
}

func TestHistogramDoesNotAliasBounds(t *testing.T) {
	bs := []float64{10, 100}
	h := NewHistogram(bs)
	bs[0] = 1
	h.Observe(5)
	if got := h.Quantile(100); got != 10 {
		t.Errorf("modifier la slice passée à NewHistogram a changé l'histogramme (p100 = %v, attendu 10) — copie les bornes", got)
	}
}
