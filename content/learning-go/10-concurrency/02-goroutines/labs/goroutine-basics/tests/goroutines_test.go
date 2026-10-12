package lab

import (
	"reflect"
	"sync/atomic"
	"testing"
	"time"
)

func within(t *testing.T, d time.Duration, f func()) {
	t.Helper()
	done := make(chan struct{})
	go func() { f(); close(done) }()
	select {
	case <-done:
	case <-time.After(d):
		t.Fatalf("pas terminé après %v : les fonctions ne s'exécutent probablement pas de façon concurrente", d)
	}
}

func TestRunAllWaitsForEveryone(t *testing.T) {
	var n atomic.Int32
	fns := make([]func(), 20)
	for i := range fns {
		fns[i] = func() {
			time.Sleep(10 * time.Millisecond)
			n.Add(1)
		}
	}
	RunAll(fns...)
	if got := n.Load(); got != 20 {
		t.Fatalf("%d fonctions terminées au retour de RunAll, attendu 20", got)
	}
}

func TestRunAllNoArguments(t *testing.T) {
	within(t, time.Second, func() { RunAll() })
}

func TestRunAllIsConcurrent(t *testing.T) {
	// Chaque fonction attend l'autre : en séquence, ce serait un deadlock.
	a, b := make(chan struct{}), make(chan struct{})
	within(t, 2*time.Second, func() {
		RunAll(
			func() { close(a); <-b },
			func() { close(b); <-a },
		)
	})
}

func TestSquareAll(t *testing.T) {
	if got := SquareAll(nil); len(got) != 0 {
		t.Fatalf("SquareAll(nil) = %v, attendu vide", got)
	}
	got := SquareAll([]int{1, -2, 3, 10})
	if want := []int{1, 4, 9, 100}; !reflect.DeepEqual(got, want) {
		t.Fatalf("SquareAll = %v, attendu %v", got, want)
	}
}

func TestSquareAllLarge(t *testing.T) {
	nums := make([]int, 5000)
	for i := range nums {
		nums[i] = i
	}
	got := SquareAll(nums)
	for i, v := range got {
		if v != i*i {
			t.Fatalf("SquareAll[%d] = %d, attendu %d", i, v, i*i)
		}
	}
}

func TestSumOfSquares(t *testing.T) {
	cases := []struct {
		nums    []int
		workers int
		want    int
	}{
		{nil, 4, 0},
		{[]int{}, 1, 0},
		{[]int{1, 2, 3}, 1, 14},
		{[]int{1, 2, 3}, 2, 14},
		{[]int{1, 2, 3}, 10, 14},
		{[]int{1, 2, 3}, 0, 14},
		{[]int{1, 2, 3}, -3, 14},
		{[]int{-4, 4}, 2, 32},
	}
	for _, c := range cases {
		if got := SumOfSquares(c.nums, c.workers); got != c.want {
			t.Errorf("SumOfSquares(%v, %d) = %d, attendu %d", c.nums, c.workers, got, c.want)
		}
	}
	big := make([]int, 10001)
	want := 0
	for i := range big {
		big[i] = i
		want += i * i
	}
	for _, w := range []int{1, 3, 8, 64} {
		if got := SumOfSquares(big, w); got != want {
			t.Errorf("SumOfSquares(big, %d) = %d, attendu %d", w, got, want)
		}
	}
}
