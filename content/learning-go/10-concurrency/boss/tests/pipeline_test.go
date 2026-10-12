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

func collect(ch <-chan int) []int {
	out := []int{}
	for v := range ch {
		out = append(out, v)
	}
	return out
}

func double(n int) int { return n * 2 }

func doubleStage(ctx context.Context, in <-chan int) <-chan int { return FanOut(ctx, in, 2, double) }
func incStage(ctx context.Context, in <-chan int) <-chan int {
	return FanOut(ctx, in, 2, func(n int) int { return n + 1 })
}

func TestSource(t *testing.T) {
	got := collect(Source(context.Background(), 5, 6, 7))
	if len(got) != 3 || got[0] != 5 || got[1] != 6 || got[2] != 7 {
		t.Fatalf("Source = %v, attendu [5 6 7]", got)
	}
	if got := collect(Source(context.Background())); len(got) != 0 {
		t.Fatalf("Source() = %v, attendu vide", got)
	}
}

func TestSourceStopsOnCancel(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 20; i++ {
		ctx, cancel := context.WithCancel(context.Background())
		ch := Source(ctx, 1, 2, 3, 4, 5)
		<-ch
		cancel()
	}
	settle(t, base)
}

func TestFanOut(t *testing.T) {
	got := collect(FanOut(context.Background(), Source(context.Background(), 1, 2, 3, 4, 5, 6), 3, double))
	sort.Ints(got)
	want := []int{2, 4, 6, 8, 10, 12}
	if len(got) != len(want) {
		t.Fatalf("FanOut = %v, attendu %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("FanOut = %v, attendu %v", got, want)
		}
	}
}

func TestFanOutUsesSeveralWorkers(t *testing.T) {
	var cur, peak atomic.Int32
	f := func(n int) int {
		c := cur.Add(1)
		for {
			p := peak.Load()
			if c <= p || peak.CompareAndSwap(p, c) {
				break
			}
		}
		time.Sleep(10 * time.Millisecond)
		cur.Add(-1)
		return n
	}
	nums := make([]int, 24)
	collect(FanOut(context.Background(), Source(context.Background(), nums...), 4, f))
	if p := peak.Load(); p < 2 || p > 4 {
		t.Fatalf("pic de %d workers simultanés, attendu entre 2 et 4", p)
	}
}

func TestFanOutNoLeakWhenConsumerStops(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 10; i++ {
		ctx, cancel := context.WithCancel(context.Background())
		out := FanOut(ctx, Source(ctx, 1, 2, 3, 4, 5, 6, 7, 8), 3, double)
		<-out
		cancel()
	}
	settle(t, base)
}

func TestChain(t *testing.T) {
	ctx := context.Background()
	got := collect(Chain(ctx, Source(ctx, 1, 2, 3), doubleStage, incStage))
	sort.Ints(got)
	want := []int{3, 5, 7}
	if len(got) != 3 || got[0] != want[0] || got[1] != want[1] || got[2] != want[2] {
		t.Fatalf("Chain = %v, attendu %v", got, want)
	}
	src := Source(ctx, 9)
	if v := <-Chain(ctx, src); v != 9 {
		t.Fatalf("Chain sans étape doit renvoyer src : %d", v)
	}
}

func TestChainCancelNoLeak(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 10; i++ {
		ctx, cancel := context.WithCancel(context.Background())
		out := Chain(ctx, Source(ctx, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), doubleStage, incStage, doubleStage)
		<-out
		cancel()
	}
	settle(t, base)
}

func after(d time.Duration, v string, err error) func(context.Context) (string, error) {
	return func(ctx context.Context) (string, error) {
		select {
		case <-time.After(d):
			return v, err
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
}

func TestFirstReturnsFastestSuccess(t *testing.T) {
	boom := errors.New("boum")
	start := time.Now()
	got, err := First(context.Background(),
		after(2*time.Second, "lent", nil),
		after(10*time.Millisecond, "", boom), // rapide mais en échec : ne compte pas
		after(40*time.Millisecond, "rapide", nil),
	)
	if err != nil || got != "rapide" {
		t.Fatalf("(%q, %v), attendu (\"rapide\", nil)", got, err)
	}
	if time.Since(start) > time.Second {
		t.Fatal("First n'a pas annulé les fonctions lentes")
	}
}

func TestFirstAllFail(t *testing.T) {
	e1, e2 := errors.New("un"), errors.New("deux")
	_, err := First(context.Background(), after(5*time.Millisecond, "", e1), after(10*time.Millisecond, "", e2))
	if !errors.Is(err, e1) || !errors.Is(err, e2) {
		t.Fatalf("err = %v, attendu les deux erreurs réunies", err)
	}
	if _, err := First[string](context.Background()); err == nil {
		t.Fatal("First sans fonction doit renvoyer une erreur")
	}
}

func TestFirstNoLeak(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 15; i++ {
		First(context.Background(), after(time.Second, "x", nil), after(time.Millisecond, "y", nil))
	}
	settle(t, base)
}

func TestRun(t *testing.T) {
	got, err := Run(context.Background(), []int{5, 3, 9, 1, 7}, 3, double, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	want := []int{2, 6, 10, 14, 18}
	if len(got) != len(want) {
		t.Fatalf("Run = %v, attendu %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("Run = %v, attendu %v (trié)", got, want)
		}
	}
}

func TestRunTimeout(t *testing.T) {
	base := runtime.NumGoroutine()
	slow := func(n int) int { time.Sleep(200 * time.Millisecond); return n }
	t0 := time.Now()
	got, err := Run(context.Background(), []int{1, 2, 3, 4, 5, 6, 7, 8}, 2, slow, 50*time.Millisecond)
	if !errors.Is(err, context.DeadlineExceeded) || got != nil {
		t.Fatalf("(%v, %v), attendu (nil, DeadlineExceeded)", got, err)
	}
	if time.Since(t0) > time.Second {
		t.Fatal("le délai global n'est pas respecté")
	}
	settle(t, base)
}

func TestRunEmpty(t *testing.T) {
	got, err := Run(context.Background(), nil, 3, double, time.Second)
	if err != nil || len(got) != 0 {
		t.Fatalf("(%v, %v), attendu ([], nil)", got, err)
	}
}
