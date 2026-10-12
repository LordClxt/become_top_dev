package lab

import (
	"context"
	"errors"
	"runtime"
	"sort"
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

func feed(vals ...int) <-chan int {
	ch := make(chan int)
	go func() {
		defer close(ch)
		for _, v := range vals {
			ch <- v
		}
	}()
	return ch
}

// feedCtx comme feed, mais s'arrête quand ctx est annulé (pour ne pas faire fuir le test lui-même).
func feedCtx(ctx context.Context, vals ...int) <-chan int {
	ch := make(chan int)
	go func() {
		defer close(ch)
		for _, v := range vals {
			select {
			case ch <- v:
			case <-ctx.Done():
				return
			}
		}
	}()
	return ch
}

func square(_ context.Context, n int) (int, error) { return n * n, nil }

func TestAllResults(t *testing.T) {
	var got []Result
	for r := range ProcessAll(context.Background(), feed(1, 2, 3, 4, 5, 6, 7), 3, square) {
		got = append(got, r)
	}
	sort.Slice(got, func(i, j int) bool { return got[i].In < got[j].In })
	if len(got) != 7 {
		t.Fatalf("%d résultats, attendu 7", len(got))
	}
	for i, r := range got {
		if r.In != i+1 || r.Out != (i+1)*(i+1) || r.Err != nil {
			t.Fatalf("résultat %d = %+v", i, r)
		}
	}
}

func TestEmptyInputClosesOutput(t *testing.T) {
	done := make(chan struct{})
	go func() {
		for range ProcessAll(context.Background(), feed(), 4, square) {
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("la sortie n'est jamais fermée pour une entrée vide")
	}
}

func TestErrorsAreReportedNotFatal(t *testing.T) {
	boom := errors.New("boum")
	f := func(_ context.Context, n int) (int, error) {
		if n%2 == 0 {
			return 0, boom
		}
		return n, nil
	}
	var okN, errN int
	for r := range ProcessAll(context.Background(), feed(1, 2, 3, 4, 5), 2, f) {
		if r.Err != nil {
			errN++
		} else {
			okN++
		}
	}
	if okN != 3 || errN != 2 {
		t.Fatalf("ok = %d, erreurs = %d ; attendu 3 et 2", okN, errN)
	}
}

func TestBoundedConcurrency(t *testing.T) {
	var cur, peak atomic.Int32
	f := func(_ context.Context, n int) (int, error) {
		c := cur.Add(1)
		for {
			p := peak.Load()
			if c <= p || peak.CompareAndSwap(p, c) {
				break
			}
		}
		time.Sleep(10 * time.Millisecond)
		cur.Add(-1)
		return n, nil
	}
	nums := make([]int, 30)
	for range ProcessAll(context.Background(), feed(nums...), 4, f) {
	}
	if p := peak.Load(); p > 4 || p < 2 {
		t.Fatalf("pic de %d goroutines simultanées, attendu entre 2 et 4", p)
	}
}

func TestWorkersZeroMeansOne(t *testing.T) {
	n := 0
	for range ProcessAll(context.Background(), feed(1, 2, 3), 0, square) {
		n++
	}
	if n != 3 {
		t.Fatalf("%d résultats avec workers = 0, attendu 3", n)
	}
}

func TestCancelWhileConsumerStoppedReading(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 10; i++ {
		ctx, cancel := context.WithCancel(context.Background())
		out := ProcessAll(ctx, feedCtx(ctx, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 3, square)
		<-out // on lit un seul résultat puis on s'en va
		cancel()
	}
	settle(t, base)
}

func TestCancelStopsSlowWorkers(t *testing.T) {
	base := runtime.NumGoroutine()
	ctx, cancel := context.WithCancel(context.Background())
	slow := func(ctx context.Context, n int) (int, error) {
		select {
		case <-time.After(5 * time.Second):
			return n, nil
		case <-ctx.Done():
			return 0, ctx.Err()
		}
	}
	out := ProcessAll(ctx, feedCtx(ctx, 1, 2, 3, 4), 2, slow)
	time.Sleep(30 * time.Millisecond)
	cancel()
	done := make(chan struct{})
	go func() {
		for range out {
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("la sortie n'est pas fermée après l'annulation")
	}
	settle(t, base)
}

func TestNoLeakOnNormalRun(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 20; i++ {
		for range ProcessAll(context.Background(), feed(1, 2, 3, 4), 3, square) {
		}
	}
	settle(t, base)
}
