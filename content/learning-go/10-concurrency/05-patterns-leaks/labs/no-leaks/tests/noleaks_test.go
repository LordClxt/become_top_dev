package lab

import (
	"context"
	"errors"
	"runtime"
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

func TestCountToFullRead(t *testing.T) {
	var got []int
	for v := range CountTo(context.Background(), 5) {
		got = append(got, v)
	}
	if len(got) != 5 || got[0] != 1 || got[4] != 5 {
		t.Fatalf("got %v, attendu 1..5", got)
	}
}

func TestCountToNoLeakWhenConsumerLeaves(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 30; i++ {
		ctx, cancel := context.WithCancel(context.Background())
		for v := range CountTo(ctx, 1000) {
			if v == 2 {
				break
			}
		}
		cancel()
	}
	settle(t, base)
}

func TestCountToClosesOnCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	ch := CountTo(ctx, 1_000_000)
	<-ch
	cancel()
	deadline := time.After(2 * time.Second)
	for {
		select {
		case _, ok := <-ch:
			if !ok {
				return
			}
		case <-deadline:
			t.Fatal("le channel n'est pas fermé après l'annulation")
		}
	}
}

func TestTimeLimitSuccess(t *testing.T) {
	v, err := TimeLimit(func() int { return 42 }, time.Second)
	if err != nil || v != 42 {
		t.Fatalf("(%d, %v), attendu (42, nil)", v, err)
	}
}

func TestTimeLimitTimeout(t *testing.T) {
	start := time.Now()
	v, err := TimeLimit(func() string { time.Sleep(300 * time.Millisecond); return "tard" }, 30*time.Millisecond)
	if !errors.Is(err, ErrTimeout) || v != "" {
		t.Fatalf("(%q, %v), attendu (\"\", ErrTimeout)", v, err)
	}
	if time.Since(start) > 250*time.Millisecond {
		t.Fatal("TimeLimit n'a pas rendu la main au délai")
	}
}

func TestTimeLimitDoesNotLeak(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 20; i++ {
		TimeLimit(func() int { time.Sleep(20 * time.Millisecond); return i }, time.Millisecond)
	}
	settle(t, base)
}

func TestPressureGauge(t *testing.T) {
	g := NewPressureGauge(2)
	release := make(chan struct{})
	var inside sync.WaitGroup
	inside.Add(2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := g.Do(func() { inside.Done(); <-release }); err != nil {
				t.Errorf("les deux premiers appels doivent passer : %v", err)
			}
		}()
	}
	inside.Wait()
	var ran atomic.Bool
	start := time.Now()
	err := g.Do(func() { ran.Store(true) })
	if !errors.Is(err, ErrBusy) || ran.Load() {
		t.Fatalf("troisième appel : err = %v, exécuté = %v ; attendu ErrBusy sans exécution", err, ran.Load())
	}
	if time.Since(start) > 100*time.Millisecond {
		t.Fatal("Do a attendu au lieu de refuser tout de suite")
	}
	close(release)
	wg.Wait()
	if err := g.Do(func() {}); err != nil {
		t.Fatalf("après la fin des appels, un jeton doit être libre : %v", err)
	}
}

func TestPressureGaugeReleasesOnPanic(t *testing.T) {
	g := NewPressureGauge(1)
	func() {
		defer func() { recover() }()
		g.Do(func() { panic("boum") })
	}()
	if err := g.Do(func() {}); err != nil {
		t.Fatalf("le jeton doit être rendu même si f panique : %v", err)
	}
}
