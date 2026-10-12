package lab

import (
	"errors"
	"sort"
	"testing"
	"time"
)

func TestTryReceive(t *testing.T) {
	ch := make(chan int, 1)
	if v, ok := TryReceive(ch); ok || v != 0 {
		t.Fatalf("channel vide : (%d, %v), attendu (0, false)", v, ok)
	}
	ch <- 7
	if v, ok := TryReceive(ch); !ok || v != 7 {
		t.Fatalf("valeur prête : (%d, %v), attendu (7, true)", v, ok)
	}
}

func TestTryReceiveDoesNotBlock(t *testing.T) {
	done := make(chan struct{})
	go func() {
		TryReceive(make(chan int)) // sans tampon, sans émetteur : ne doit pas bloquer
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("TryReceive a bloqué")
	}
}

func TestFirstOf(t *testing.T) {
	a, b := make(chan int), make(chan int)
	go func() {
		time.Sleep(30 * time.Millisecond)
		b <- 2
	}()
	go func() {
		time.Sleep(300 * time.Millisecond)
		a <- 1
	}()
	if got := FirstOf(a, b); got != 2 {
		t.Fatalf("FirstOf = %d, attendu 2 (b arrive en premier)", got)
	}
}

func TestWithTimeout(t *testing.T) {
	ch := make(chan int)
	start := time.Now()
	_, err := WithTimeout(ch, 50*time.Millisecond)
	if !errors.Is(err, ErrTimeout) {
		t.Fatalf("err = %v, attendu ErrTimeout", err)
	}
	if time.Since(start) > time.Second {
		t.Fatal("le délai n'est pas respecté")
	}
	ready := make(chan int, 1)
	ready <- 4
	if v, err := WithTimeout(ready, time.Second); v != 4 || err != nil {
		t.Fatalf("(%d, %v), attendu (4, nil)", v, err)
	}
	closed := make(chan int)
	close(closed)
	if v, err := WithTimeout(closed, time.Second); v != 0 || err != nil {
		t.Fatalf("channel fermé : (%d, %v), attendu (0, nil)", v, err)
	}
}

func producer(vals ...int) <-chan int {
	ch := make(chan int)
	go func() {
		defer close(ch)
		for _, v := range vals {
			time.Sleep(time.Millisecond)
			ch <- v
		}
	}()
	return ch
}

func TestJoin(t *testing.T) {
	done := make(chan []int, 1)
	go func() { done <- Join(producer(1, 3, 5), producer(2, 4, 6, 8, 10)) }()
	select {
	case got := <-done:
		sort.Ints(got)
		want := []int{1, 2, 3, 4, 5, 6, 8, 10}
		if len(got) != len(want) {
			t.Fatalf("Join = %v, attendu %v (à l'ordre près)", got, want)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("Join = %v, attendu %v (à l'ordre près)", got, want)
			}
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Join ne se termine pas : un channel fermé est-il relu en boucle ou jamais mis à nil ?")
	}
}

func TestJoinBothClosed(t *testing.T) {
	a, b := make(chan int), make(chan int)
	close(a)
	close(b)
	done := make(chan []int, 1)
	go func() { done <- Join(a, b) }()
	select {
	case got := <-done:
		if got == nil || len(got) != 0 {
			t.Fatalf("Join(fermés) = %#v, attendu une slice vide non nil", got)
		}
	case <-time.After(time.Second):
		t.Fatal("Join ne se termine pas sur deux channels fermés")
	}
}
