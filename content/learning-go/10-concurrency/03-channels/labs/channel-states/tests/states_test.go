package lab

import (
	"reflect"
	"sync/atomic"
	"testing"
	"time"
)

func TestSafeSend(t *testing.T) {
	open := make(chan int, 2)
	if !SafeSend(open, 1) {
		t.Fatal("SafeSend sur un channel ouvert avec de la place doit renvoyer true")
	}
	if got := <-open; got != 1 {
		t.Fatalf("valeur reçue = %d, attendu 1", got)
	}
	closed := make(chan int, 2)
	close(closed)
	if SafeSend(closed, 1) {
		t.Fatal("SafeSend sur un channel fermé doit renvoyer false, sans paniquer")
	}
}

func TestSafeClose(t *testing.T) {
	ch := make(chan int)
	if !SafeClose(ch) {
		t.Fatal("première fermeture : true attendu")
	}
	if SafeClose(ch) {
		t.Fatal("seconde fermeture : false attendu (sans panic)")
	}
	var nilCh chan int
	if SafeClose(nilCh) {
		t.Fatal("fermer un channel nil : false attendu (sans panic)")
	}
}

func TestDrain(t *testing.T) {
	ch := make(chan int, 4)
	ch <- 1
	ch <- 2
	ch <- 3
	close(ch)
	if got, want := Drain(ch), []int{1, 2, 3}; !reflect.DeepEqual(got, want) {
		t.Fatalf("Drain = %v, attendu %v", got, want)
	}
	empty := make(chan int)
	close(empty)
	if got := Drain(empty); got == nil || len(got) != 0 {
		t.Fatalf("Drain(vide fermé) = %#v, attendu une slice vide non nil", got)
	}
}

func TestStartTogether(t *testing.T) {
	var started atomic.Int32
	release, wait := StartTogether(10, func(i int) { started.Add(1) })
	time.Sleep(50 * time.Millisecond)
	if got := started.Load(); got != 0 {
		t.Fatalf("%d appels avant release(), attendu 0", got)
	}
	release()
	done := make(chan struct{})
	go func() { wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("wait() ne se termine pas après release()")
	}
	if got := started.Load(); got != 10 {
		t.Fatalf("%d appels terminés, attendu 10", got)
	}
}

func TestStartTogetherSeesEachIndex(t *testing.T) {
	seen := make([]atomic.Bool, 8)
	release, wait := StartTogether(8, func(i int) { seen[i].Store(true) })
	release()
	wait()
	for i := range seen {
		if !seen[i].Load() {
			t.Errorf("l'indice %d n'a jamais été passé à f", i)
		}
	}
}
