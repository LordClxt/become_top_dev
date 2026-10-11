package lab

import (
	"fmt"
	"math"
	"testing"
)

func TestNoFalseNegatives(t *testing.T) {
	b := NewBloom(10_000, 7)
	for i := 0; i < 1000; i++ {
		b.Add(fmt.Sprintf("present-%d", i))
	}
	for i := 0; i < 1000; i++ {
		if !b.MayContain(fmt.Sprintf("present-%d", i)) {
			t.Fatalf("faux négatif pour present-%d : un filtre de Bloom ne doit jamais en produire", i)
		}
	}
}

func TestEmptyFilterContainsNothing(t *testing.T) {
	b := NewBloom(1024, 3)
	for i := 0; i < 100; i++ {
		if b.MayContain(fmt.Sprint(i)) {
			t.Fatalf("filtre vide : %d déclaré peut-être présent", i)
		}
	}
}

func TestMeasuredFalsePositiveRateMatchesTheory(t *testing.T) {
	const n, bitsPerKey = 2000, 10
	m := uint(n * bitsPerKey)
	k := OptimalK(m, n)
	b := NewBloom(m, k)
	for i := 0; i < n; i++ {
		b.Add(fmt.Sprintf("present-%d", i))
	}
	false_ := 0
	const probes = 20000
	for i := 0; i < probes; i++ {
		if b.MayContain(fmt.Sprintf("absent-%d", i)) {
			false_++
		}
	}
	measured := float64(false_) / probes
	theory := FalsePositiveRate(m, k, n)
	if measured > 2.5*theory+0.002 {
		t.Errorf("taux mesuré %.4f, théorique %.4f (k=%d) : trop de faux positifs, vérifie que tu poses k bits différents par clé", measured, theory, k)
	}
	if measured == 0 {
		t.Error("taux nul : suspect pour 10 bits par clé, le filtre est-il rempli ?")
	}
}

func TestMoreBitsFewerFalsePositives(t *testing.T) {
	rate := func(bitsPerKey uint) float64 {
		const n = 1000
		m := bitsPerKey * n
		b := NewBloom(m, OptimalK(m, n))
		for i := 0; i < n; i++ {
			b.Add(fmt.Sprint("in-", i))
		}
		c := 0
		for i := 0; i < 10000; i++ {
			if b.MayContain(fmt.Sprint("out-", i)) {
				c++
			}
		}
		return float64(c) / 10000
	}
	if r4, r16 := rate(4), rate(16); r16 >= r4 {
		t.Errorf("16 bits par clé (%.4f) doivent faire mieux que 4 (%.4f)", r16, r4)
	}
}

func TestFalsePositiveRateFormula(t *testing.T) {
	cases := []struct {
		m, k, n uint
		want    float64
	}{
		{10_000, 7, 1000, 0.0081},
		{1000, 1, 1000, 1 - math.Exp(-1)},
		{10_000, 3, 0, 0},
	}
	for _, c := range cases {
		if got := FalsePositiveRate(c.m, c.k, c.n); math.Abs(got-c.want) > 5e-4 {
			t.Errorf("FalsePositiveRate(%d, %d, %d) = %.5f, attendu ≈ %.5f", c.m, c.k, c.n, got, c.want)
		}
	}
}

func TestOptimalK(t *testing.T) {
	cases := []struct{ m, n, want uint }{{10_000, 1000, 7}, {8000, 1000, 6}, {1000, 1000, 1}, {100, 1000, 1}, {100, 0, 1}, {20_000, 1000, 14}}
	for _, c := range cases {
		if got := OptimalK(c.m, c.n); got != c.want {
			t.Errorf("OptimalK(%d, %d) = %d, attendu %d", c.m, c.n, got, c.want)
		}
	}
}
