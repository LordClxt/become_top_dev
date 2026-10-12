package lab

import (
	"errors"
	"reflect"
	"runtime"
	"sort"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func settle(t *testing.T, base int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for runtime.NumGoroutine() > base {
		if time.Now().After(deadline) {
			t.Fatalf("goroutines restantes : %d, attendu %d (fuite ?)", runtime.NumGoroutine(), base)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func gen(vals ...int) <-chan int {
	ch := make(chan int)
	go func() {
		defer close(ch)
		for _, v := range vals {
			ch <- v
		}
	}()
	return ch
}

func TestMerge(t *testing.T) {
	var got []int
	done := make(chan struct{})
	go func() {
		for v := range Merge(gen(1, 2, 3), gen(10, 20), gen(100)) {
			got = append(got, v)
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Merge ne ferme jamais sa sortie")
	}
	sort.Ints(got)
	if want := []int{1, 2, 3, 10, 20, 100}; !reflect.DeepEqual(got, want) {
		t.Fatalf("Merge = %v, attendu %v (à l'ordre près)", got, want)
	}
}

func TestMergeNoInput(t *testing.T) {
	select {
	case _, ok := <-Merge():
		if ok {
			t.Fatal("Merge() doit fermer sa sortie sans rien livrer")
		}
	case <-time.After(time.Second):
		t.Fatal("Merge() doit fermer sa sortie tout de suite")
	}
}

func TestMergeNoLeak(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 20; i++ {
		for range Merge(gen(1, 2), gen(3, 4)) {
		}
	}
	settle(t, base)
}

func TestProcessAllOrderAndValues(t *testing.T) {
	in := make([]int, 200)
	for i := range in {
		in[i] = i
	}
	got := ProcessAll(in, 8, func(n int) int { return n * n })
	for i, v := range got {
		if v != i*i {
			t.Fatalf("ProcessAll[%d] = %d, attendu %d", i, v, i*i)
		}
	}
	if got := ProcessAll(nil, 4, func(n int) int { return n }); len(got) != 0 {
		t.Fatalf("ProcessAll(nil) = %v, attendu vide", got)
	}
	if got := ProcessAll([]int{2, 3}, 0, func(n int) int { return n + 1 }); !reflect.DeepEqual(got, []int{3, 4}) {
		t.Fatalf("workers=0 : %v, attendu [3 4]", got)
	}
}

func TestProcessAllBoundsConcurrency(t *testing.T) {
	var cur, peak atomic.Int32
	in := make([]int, 40)
	ProcessAll(in, 4, func(n int) int {
		c := cur.Add(1)
		for {
			p := peak.Load()
			if c <= p || peak.CompareAndSwap(p, c) {
				break
			}
		}
		time.Sleep(5 * time.Millisecond)
		cur.Add(-1)
		return n
	})
	if p := peak.Load(); p > 4 {
		t.Fatalf("pic de %d goroutines simultanées, limite 4", p)
	}
	if p := peak.Load(); p < 2 {
		t.Fatalf("pic de %d : le travail n'est pas réparti sur plusieurs goroutines", p)
	}
}

func TestRunAllErr(t *testing.T) {
	boom1, boom2 := errors.New("un"), errors.New("deux")
	var ran atomic.Int32
	ok := func() error { ran.Add(1); return nil }
	if err := RunAllErr(ok, ok, ok); err != nil || ran.Load() != 3 {
		t.Fatalf("err = %v, exécutées = %d ; attendu nil et 3", err, ran.Load())
	}
	slow := func() error { time.Sleep(30 * time.Millisecond); ran.Add(1); return boom1 }
	fast := func() error { ran.Add(1); return boom2 }
	ran.Store(0)
	err := RunAllErr(slow, fast, ok)
	if !errors.Is(err, boom1) {
		t.Fatalf("err = %v, attendu la première erreur dans l'ordre des arguments (un)", err)
	}
	if ran.Load() != 3 {
		t.Fatalf("%d fonctions terminées, attendu 3 : RunAllErr doit attendre toutes les fonctions", ran.Load())
	}
	if RunAllErr() != nil {
		t.Fatal("RunAllErr() sans argument doit renvoyer nil")
	}
}

func TestLazyBuildsOnce(t *testing.T) {
	var builds atomic.Int32
	get := Lazy(func() []int {
		builds.Add(1)
		time.Sleep(10 * time.Millisecond)
		return []int{1, 2, 3}
	})
	if builds.Load() != 0 {
		t.Fatal("Lazy ne doit rien construire avant le premier appel")
	}
	var wg sync.WaitGroup
	results := make([][]int, 50)
	for i := range results {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results[i] = get()
		}()
	}
	wg.Wait()
	if b := builds.Load(); b != 1 {
		t.Fatalf("build appelée %d fois, attendu 1", b)
	}
	for _, r := range results {
		if !reflect.DeepEqual(r, []int{1, 2, 3}) {
			t.Fatalf("valeur = %v", r)
		}
	}
}
