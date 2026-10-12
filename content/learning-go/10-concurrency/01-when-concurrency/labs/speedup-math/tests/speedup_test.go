package lab

import (
	"math"
	"reflect"
	"testing"
)

func near(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestSpeedup(t *testing.T) {
	cases := []struct {
		p    float64
		n    int
		want float64
	}{
		{0.75, 1, 1},
		{0.75, 2, 1.6},
		{0.75, 3, 2},
		{0.75, 4, 1 / 0.4375},
		{0, 100, 1},
		{1, 8, 8},
	}
	for _, c := range cases {
		if got := Speedup(c.p, c.n); !near(got, c.want) {
			t.Errorf("Speedup(%v, %d) = %v, attendu %v", c.p, c.n, got, c.want)
		}
	}
}

func TestMaxSpeedup(t *testing.T) {
	if got := MaxSpeedup(0.75); !near(got, 4) {
		t.Errorf("MaxSpeedup(0,75) = %v, attendu 4", got)
	}
	if got := MaxSpeedup(0); !near(got, 1) {
		t.Errorf("MaxSpeedup(0) = %v, attendu 1", got)
	}
	if got := MaxSpeedup(1); !math.IsInf(got, 1) {
		t.Errorf("MaxSpeedup(1) = %v, attendu +Inf", got)
	}
}

func TestCoresFor(t *testing.T) {
	cases := []struct {
		p, target float64
		cores     int
		ok        bool
	}{
		{0.75, 1, 1, true},
		{0.75, 0.5, 1, true},
		{0.75, 1.5, 2, true},
		{0.75, 1.9, 3, true},
		{0.9, 4.9, 9, true},
		{0.75, 3.9, 117, true},
		{0.75, 4, 0, false},
		{0.75, 5, 0, false},
		{1, 8, 8, true},
	}
	for _, c := range cases {
		cores, ok := CoresFor(c.p, c.target)
		if cores != c.cores || ok != c.ok {
			t.Errorf("CoresFor(%v, %v) = (%d, %v), attendu (%d, %v)", c.p, c.target, cores, ok, c.cores, c.ok)
		}
	}
}

func TestChunks(t *testing.T) {
	cases := []struct {
		n, parts int
		want     [][2]int
	}{
		{10, 3, [][2]int{{0, 4}, {4, 7}, {7, 10}}},
		{6, 2, [][2]int{{0, 3}, {3, 6}}},
		{3, 5, [][2]int{{0, 1}, {1, 2}, {2, 3}}},
		{5, 1, [][2]int{{0, 5}}},
		{0, 3, nil},
		{4, 0, nil},
	}
	for _, c := range cases {
		if got := Chunks(c.n, c.parts); !reflect.DeepEqual(got, c.want) {
			t.Errorf("Chunks(%d, %d) = %v, attendu %v", c.n, c.parts, got, c.want)
		}
	}
}
