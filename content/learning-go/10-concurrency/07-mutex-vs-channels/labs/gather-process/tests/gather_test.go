package lab

import (
	"context"
	"errors"
	"runtime"
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

// service renvoie une fonction qui rend v après d, ou s'arrête dès que le contexte est annulé.
func service(v int, d time.Duration, err error) func(context.Context) (int, error) {
	return func(ctx context.Context) (int, error) {
		select {
		case <-time.After(d):
			return v, err
		case <-ctx.Done():
			return 0, ctx.Err()
		}
	}
}

func TestGatherSuccess(t *testing.T) {
	a, b, err := Gather(context.Background(), service(1, 20*time.Millisecond, nil), service(2, 20*time.Millisecond, nil))
	if err != nil || a != 1 || b != 2 {
		t.Fatalf("(%d, %d, %v), attendu (1, 2, nil)", a, b, err)
	}
}

func TestGatherIsParallel(t *testing.T) {
	start := time.Now()
	Gather(context.Background(), service(1, 100*time.Millisecond, nil), service(2, 100*time.Millisecond, nil))
	if d := time.Since(start); d > 170*time.Millisecond {
		t.Fatalf("durée %v : les deux appels ne sont pas faits en parallèle", d)
	}
}

func TestGatherFirstErrorCancelsTheOther(t *testing.T) {
	boom := errors.New("boum")
	start := time.Now()
	_, _, err := Gather(context.Background(), service(1, 2*time.Second, nil), service(0, 10*time.Millisecond, boom))
	if !errors.Is(err, boom) {
		t.Fatalf("err = %v, attendu boum (la première erreur)", err)
	}
	if d := time.Since(start); d > 500*time.Millisecond {
		t.Fatalf("durée %v : l'autre appel n'a pas été annulé", d)
	}
}

func TestGatherNoLeak(t *testing.T) {
	base := runtime.NumGoroutine()
	boom := errors.New("boum")
	for i := 0; i < 20; i++ {
		Gather(context.Background(), service(1, time.Second, nil), service(0, time.Millisecond, boom))
		Gather(context.Background(), service(1, time.Millisecond, nil), service(2, time.Millisecond, nil))
	}
	settle(t, base)
}

func TestGatherAndProcess(t *testing.T) {
	sum := func(_ context.Context, a, b int) (int, error) { return a + b, nil }
	got, err := GatherAndProcess(context.Background(), time.Second, service(3, 10*time.Millisecond, nil), service(4, 10*time.Millisecond, nil), sum)
	if err != nil || got != 7 {
		t.Fatalf("(%d, %v), attendu (7, nil)", got, err)
	}
}

func TestGatherAndProcessTimeout(t *testing.T) {
	called := false
	fc := func(context.Context, int, int) (int, error) { called = true; return 0, nil }
	start := time.Now()
	_, err := GatherAndProcess(context.Background(), 50*time.Millisecond, service(1, 2*time.Second, nil), service(2, 10*time.Millisecond, nil), fc)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("err = %v, attendu context.DeadlineExceeded", err)
	}
	if called {
		t.Fatal("fc ne doit pas être appelée quand le délai a expiré")
	}
	if d := time.Since(start); d > time.Second {
		t.Fatalf("durée %v : le délai global n'est pas respecté", d)
	}
}

func TestGatherAndProcessStageCError(t *testing.T) {
	boom := errors.New("c a échoué")
	fc := func(context.Context, int, int) (int, error) { return 0, boom }
	_, err := GatherAndProcess(context.Background(), time.Second, service(1, time.Millisecond, nil), service(2, time.Millisecond, nil), fc)
	if !errors.Is(err, boom) {
		t.Fatalf("err = %v, attendu l'erreur de fc", err)
	}
}

func TestGatherAndProcessParentCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	go func() { time.Sleep(20 * time.Millisecond); cancel() }()
	fc := func(context.Context, int, int) (int, error) { return 1, nil }
	_, err := GatherAndProcess(ctx, 5*time.Second, service(1, 2*time.Second, nil), service(2, 2*time.Second, nil), fc)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("err = %v, attendu context.Canceled", err)
	}
}

func TestGatherAndProcessNoLeak(t *testing.T) {
	base := runtime.NumGoroutine()
	fc := func(context.Context, int, int) (int, error) { return 1, nil }
	for i := 0; i < 15; i++ {
		GatherAndProcess(context.Background(), 20*time.Millisecond, service(1, time.Second, nil), service(2, time.Millisecond, nil), fc)
	}
	settle(t, base)
}
