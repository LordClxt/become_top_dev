package lab

import (
	"reflect"
	"runtime"
	"testing"
	"time"
)

// settle attend que le nombre de goroutines redescende à base (les goroutines terminées disparaissent avec un léger retard).
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

func TestGenerateAndCollect(t *testing.T) {
	var ch <-chan int = Generate(3, 1, 4, 1, 5) // le type de retour doit être en lecture seule
	got := Collect(ch)
	if want := []int{3, 1, 4, 1, 5}; !reflect.DeepEqual(got, want) {
		t.Fatalf("Collect(Generate(...)) = %v, attendu %v", got, want)
	}
}

func TestGenerateEmpty(t *testing.T) {
	got := Collect(Generate())
	if got == nil || len(got) != 0 {
		t.Fatalf("Collect(Generate()) = %#v, attendu une slice vide non nil", got)
	}
}

func TestMap(t *testing.T) {
	double := func(n int) int { return n * 2 }
	got := Collect(Map(Map(Generate(1, 2, 3), double), double))
	if want := []int{4, 8, 12}; !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v, attendu %v", got, want)
	}
}

func TestNoLeakAfterFullRead(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 50; i++ {
		Collect(Map(Generate(1, 2, 3, 4), func(n int) int { return n + 1 }))
	}
	settle(t, base)
}

func TestPingPong(t *testing.T) {
	got := PingPong(3)
	want := []string{"ping 1", "pong 1", "ping 2", "pong 2", "ping 3", "pong 3"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("PingPong(3) = %v, attendu %v", got, want)
	}
	if got := PingPong(0); len(got) != 0 {
		t.Fatalf("PingPong(0) = %v, attendu vide", got)
	}
}

func TestPingPongNoLeak(t *testing.T) {
	base := runtime.NumGoroutine()
	for i := 0; i < 20; i++ {
		PingPong(5)
	}
	settle(t, base)
}
