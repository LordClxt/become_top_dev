package lab

import (
	"fmt"
	"sync"
	"testing"
)

func TestBasics(t *testing.T) {
	s := NewScoreboard()
	if _, ok := s.Get("ana"); ok {
		t.Fatal("Get sur un nom absent doit renvoyer false")
	}
	if _, _, ok := s.Top(); ok {
		t.Fatal("Top sur un tableau vide doit renvoyer ok = false")
	}
	if got := s.Add("ana", 5); got != 5 {
		t.Fatalf("Add = %d, attendu 5", got)
	}
	if got := s.Add("ana", 3); got != 8 {
		t.Fatalf("Add = %d, attendu 8", got)
	}
	if v, ok := s.Get("ana"); !ok || v != 8 {
		t.Fatalf("Get = (%d, %v), attendu (8, true)", v, ok)
	}
}

func TestTopTieBreak(t *testing.T) {
	s := NewScoreboard()
	s.Add("zoe", 10)
	s.Add("bob", 10)
	s.Add("ana", 7)
	name, pts, ok := s.Top()
	if !ok || name != "bob" || pts != 10 {
		t.Fatalf("Top = (%q, %d, %v), attendu (\"bob\", 10, true)", name, pts, ok)
	}
}

func TestSnapshotIsACopy(t *testing.T) {
	s := NewScoreboard()
	s.Add("ana", 1)
	snap := s.Snapshot()
	snap["ana"] = 999
	snap["intrus"] = 1
	if v, _ := s.Get("ana"); v != 1 {
		t.Fatalf("modifier Snapshot a changé le tableau : %d", v)
	}
	if _, ok := s.Get("intrus"); ok {
		t.Fatal("ajouter dans Snapshot a changé le tableau")
	}
}

func TestConcurrentUse(t *testing.T) {
	s := NewScoreboard()
	var wg sync.WaitGroup
	for g := 0; g < 20; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 200; i++ {
				s.Add(fmt.Sprintf("p%d", i%5), 1)
				s.Get("p0")
				s.Top()
				s.Snapshot()
			}
		}()
	}
	wg.Wait()
	total := 0
	for _, v := range s.Snapshot() {
		total += v
	}
	if total != 20*200 {
		t.Fatalf("total = %d, attendu %d : des mises à jour ont été perdues", total, 20*200)
	}
}
