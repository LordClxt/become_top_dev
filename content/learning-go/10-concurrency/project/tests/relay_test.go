package lab

import (
	"context"
	"errors"
	"fmt"
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

func quick(id string) Job {
	return Job{ID: id, Run: func(context.Context) error { return nil }}
}

func waitStatus(t *testing.T, r *Relay, id string, want Status) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if st, _, ok := r.Result(id); ok && st == want {
			return
		}
		time.Sleep(2 * time.Millisecond)
	}
	st, _, ok := r.Result(id)
	t.Fatalf("job %s : état %q (connu : %v), attendu %q", id, st, ok, want)
}

// ---------- Jalon 1 ----------

func TestM1JobsRunAndFinish(t *testing.T) {
	r := New(3, 10)
	defer r.Shutdown(context.Background())
	for i := 0; i < 8; i++ {
		if err := r.Submit(quick(fmt.Sprintf("j%d", i))); err != nil {
			t.Fatalf("Submit j%d : %v", i, err)
		}
	}
	for i := 0; i < 8; i++ {
		waitStatus(t, r, fmt.Sprintf("j%d", i), Done)
	}
}

func TestM1FailedJobKeepsItsError(t *testing.T) {
	r := New(1, 4)
	defer r.Shutdown(context.Background())
	boom := errors.New("boum")
	r.Submit(Job{ID: "x", Run: func(context.Context) error { return boom }})
	waitStatus(t, r, "x", Failed)
	if _, err, _ := r.Result("x"); !errors.Is(err, boom) {
		t.Fatalf("erreur = %v, attendu boum", err)
	}
}

func TestM1UnknownJob(t *testing.T) {
	r := New(1, 1)
	defer r.Shutdown(context.Background())
	if _, _, ok := r.Result("nope"); ok {
		t.Fatal("un job inconnu doit renvoyer ok = false")
	}
}

func TestM1RunsConcurrentlyButBounded(t *testing.T) {
	r := New(3, 20)
	defer r.Shutdown(context.Background())
	var cur, peak atomic.Int32
	for i := 0; i < 12; i++ {
		r.Submit(Job{ID: fmt.Sprintf("c%d", i), Run: func(context.Context) error {
			c := cur.Add(1)
			for {
				p := peak.Load()
				if c <= p || peak.CompareAndSwap(p, c) {
					break
				}
			}
			time.Sleep(15 * time.Millisecond)
			cur.Add(-1)
			return nil
		}})
	}
	for i := 0; i < 12; i++ {
		waitStatus(t, r, fmt.Sprintf("c%d", i), Done)
	}
	if p := peak.Load(); p > 3 || p < 2 {
		t.Fatalf("pic de %d jobs simultanés, attendu entre 2 et 3", p)
	}
}

func TestM1StatusRunning(t *testing.T) {
	r := New(1, 2)
	defer r.Shutdown(context.Background())
	started, release := make(chan struct{}), make(chan struct{})
	r.Submit(Job{ID: "slow", Run: func(context.Context) error { close(started); <-release; return nil }})
	<-started
	if st, _, _ := r.Result("slow"); st != Running {
		t.Fatalf("état = %q, attendu running", st)
	}
	close(release)
	waitStatus(t, r, "slow", Done)
}

// ---------- Jalon 2 ----------

func TestM2FullQueueRefusesWithoutBlocking(t *testing.T) {
	r := New(1, 2)
	started, release := make(chan struct{}), make(chan struct{})
	r.Submit(Job{ID: "blocker", Run: func(context.Context) error { close(started); <-release; return nil }})
	<-started // le worker est occupé, la file est vide
	if err := r.Submit(quick("q1")); err != nil {
		t.Fatalf("q1 : %v", err)
	}
	if err := r.Submit(quick("q2")); err != nil {
		t.Fatalf("q2 : %v", err)
	}
	t0 := time.Now()
	err := r.Submit(quick("q3"))
	if !errors.Is(err, ErrFull) {
		t.Fatalf("q3 : %v, attendu ErrFull", err)
	}
	if time.Since(t0) > 100*time.Millisecond {
		t.Fatal("Submit a bloqué au lieu de refuser")
	}
	if _, _, ok := r.Result("q3"); ok {
		t.Fatal("un job refusé ne doit pas être enregistré")
	}
	close(release)
	waitStatus(t, r, "q2", Done)
	if err := r.Submit(quick("q4")); err != nil {
		t.Fatalf("après libération de la file, q4 doit passer : %v", err)
	}
	r.Shutdown(context.Background())
}

func TestM2Duplicate(t *testing.T) {
	r := New(1, 4)
	defer r.Shutdown(context.Background())
	if err := r.Submit(quick("same")); err != nil {
		t.Fatal(err)
	}
	if err := r.Submit(quick("same")); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("err = %v, attendu ErrDuplicate", err)
	}
}

func TestM2Stats(t *testing.T) {
	r := New(1, 1)
	started, release := make(chan struct{}), make(chan struct{})
	r.Submit(Job{ID: "a", Run: func(context.Context) error { close(started); <-release; return nil }})
	<-started
	r.Submit(quick("b"))     // en file
	r.Submit(quick("c"))     // refusé : file pleine
	s := r.Stats()
	if s.Submitted != 2 || s.Rejected != 1 || s.InFlight != 1 {
		t.Fatalf("Stats = %+v, attendu Submitted 2, Rejected 1, InFlight 1", s)
	}
	close(release)
	waitStatus(t, r, "b", Done)
	r.Submit(Job{ID: "d", Run: func(context.Context) error { return errors.New("x") }})
	waitStatus(t, r, "d", Failed)
	s = r.Stats()
	if s.Completed != 2 || s.Failed != 1 || s.InFlight != 0 {
		t.Fatalf("Stats = %+v, attendu Completed 2, Failed 1, InFlight 0", s)
	}
	r.Shutdown(context.Background())
}

func TestM2ConcurrentSubmitters(t *testing.T) {
	r := New(4, 50)
	var wg sync.WaitGroup
	var accepted atomic.Int32
	for g := 0; g < 10; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 20; i++ {
				if r.Submit(quick(fmt.Sprintf("g%d-%d", g, i))) == nil {
					accepted.Add(1)
				}
			}
		}()
	}
	wg.Wait()
	r.Shutdown(context.Background())
	s := r.Stats()
	if int32(s.Submitted) != accepted.Load() || s.Submitted+s.Rejected != 200 {
		t.Fatalf("Stats = %+v, acceptés = %d", s, accepted.Load())
	}
	if s.Completed != s.Submitted {
		t.Fatalf("Completed = %d, attendu %d", s.Completed, s.Submitted)
	}
}

// ---------- Jalon 3 ----------

func TestM3ShutdownDrainsEverything(t *testing.T) {
	r := New(2, 20)
	var done atomic.Int32
	for i := 0; i < 10; i++ {
		r.Submit(Job{ID: fmt.Sprintf("s%d", i), Run: func(context.Context) error {
			time.Sleep(10 * time.Millisecond)
			done.Add(1)
			return nil
		}})
	}
	if err := r.Shutdown(context.Background()); err != nil {
		t.Fatalf("Shutdown : %v", err)
	}
	if done.Load() != 10 {
		t.Fatalf("%d jobs terminés au retour de Shutdown, attendu 10", done.Load())
	}
	if err := r.Submit(quick("late")); !errors.Is(err, ErrClosed) {
		t.Fatalf("Submit après Shutdown : %v, attendu ErrClosed", err)
	}
}

func TestM3ShutdownTimeoutCancelsJobs(t *testing.T) {
	r := New(1, 2)
	started := make(chan struct{})
	cancelled := make(chan struct{})
	r.Submit(Job{ID: "long", Run: func(ctx context.Context) error {
		close(started)
		<-ctx.Done()
		close(cancelled)
		return ctx.Err()
	}})
	<-started
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	t0 := time.Now()
	err := r.Shutdown(ctx)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("Shutdown = %v, attendu DeadlineExceeded", err)
	}
	if time.Since(t0) > time.Second {
		t.Fatal("Shutdown n'a pas rendu la main au délai")
	}
	select {
	case <-cancelled:
	case <-time.After(2 * time.Second):
		t.Fatal("le job en cours n'a pas vu son contexte annulé")
	}
}

func TestM3ShutdownIsIdempotentAndConcurrent(t *testing.T) {
	r := New(2, 5)
	for i := 0; i < 4; i++ {
		r.Submit(quick(fmt.Sprintf("i%d", i)))
	}
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := r.Shutdown(context.Background()); err != nil {
				t.Errorf("Shutdown : %v", err)
			}
		}()
	}
	wg.Wait()
	if err := r.Shutdown(context.Background()); err != nil {
		t.Fatalf("Shutdown répété : %v", err)
	}
}

func TestM3SubmitRacesWithShutdown(t *testing.T) {
	for i := 0; i < 20; i++ {
		r := New(2, 3)
		var wg sync.WaitGroup
		for g := 0; g < 4; g++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for k := 0; k < 10; k++ {
					r.Submit(quick(fmt.Sprintf("r%d-%d", g, k))) // ne doit jamais paniquer (send on closed channel)
				}
			}()
		}
		r.Shutdown(context.Background())
		wg.Wait()
	}
}

func TestM3NoGoroutineLeakAfterShutdown(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 15; i++ {
		r := New(3, 5)
		for k := 0; k < 4; k++ {
			r.Submit(quick(fmt.Sprintf("n%d", k)))
		}
		r.Shutdown(context.Background())
	}
	settle(t, base)
}
