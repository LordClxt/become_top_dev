package lab

import (
	"slices"
	"testing"
)

func TestFizzBuzzClassic(t *testing.T) {
	rules := []Rule{{3, "Fizz"}, {5, "Buzz"}}
	got := FizzBuzz(15, rules)
	want := []string{"1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"}
	if !slices.Equal(got, want) {
		t.Errorf("FizzBuzz(15, Fizz/Buzz) = %v, attendu %v", got, want)
	}
}

func TestFizzBuzzCustomRules(t *testing.T) {
	rules := []Rule{{2, "Ping"}, {3, "Pong"}, {7, "Pang"}}
	got := FizzBuzz(14, rules)
	want := []string{"1", "Ping", "Pong", "Ping", "5", "PingPong", "Pang", "Ping", "Pong", "Ping", "11", "PingPong", "13", "PingPang"}
	if !slices.Equal(got, want) {
		t.Errorf("règles Ping/Pong/Pang : %v, attendu %v — les mots se collent dans l'ordre des règles", got, want)
	}
}

func TestFizzBuzzEdgeCases(t *testing.T) {
	if got := FizzBuzz(0, []Rule{{3, "Fizz"}}); len(got) != 0 {
		t.Errorf("FizzBuzz(0) = %v, attendu vide", got)
	}
	if got := FizzBuzz(-5, nil); len(got) != 0 {
		t.Errorf("FizzBuzz(-5) = %v, attendu vide", got)
	}
	if got := FizzBuzz(3, nil); !slices.Equal(got, []string{"1", "2", "3"}) {
		t.Errorf("sans règle, FizzBuzz(3) = %v, attendu les nombres", got)
	}
	// Un diviseur nul ou négatif doit être ignoré (i % 0 ferait paniquer).
	if got := FizzBuzz(3, []Rule{{0, "Zero"}, {-3, "Neg"}, {3, "Fizz"}}); !slices.Equal(got, []string{"1", "2", "Fizz"}) {
		t.Errorf("diviseurs invalides : %v, attendu [1 2 Fizz]", got)
	}
	// Un mot vide ne compte pas comme une règle appliquée.
	if got := FizzBuzz(2, []Rule{{1, ""}}); !slices.Equal(got, []string{"1", "2"}) {
		t.Errorf("règle au mot vide : %v, attendu [1 2]", got)
	}
}

func TestCollatz(t *testing.T) {
	cases := map[int]int{1: 0, 2: 1, 3: 7, 6: 8, 7: 16, 27: 111, 97: 118, 0: -1, -4: -1}
	for n, want := range cases {
		if got := Collatz(n); got != want {
			t.Errorf("Collatz(%d) = %d, attendu %d", n, got, want)
		}
	}
}

func TestReadUntil(t *testing.T) {
	cases := []struct {
		tokens []string
		stop   string
		taken  []string
		found  bool
		why    string
	}{
		{[]string{"a", "b", "END", "c"}, "END", []string{"a", "b"}, true, "la sentinelle est exclue"},
		{[]string{"END", "a"}, "END", []string{}, true, "sentinelle en première position : rien à lire"},
		{[]string{"a", "b"}, "END", []string{"a", "b"}, false, "sentinelle absente : tous les jetons, found = false"},
		{[]string{"a", "END"}, "END", []string{"a"}, true, "sentinelle en dernière position"},
		{nil, "END", nil, false, "aucun jeton"},
		{[]string{"a", "END", "b", "END"}, "END", []string{"a"}, true, "on s'arrête à la première sentinelle"},
	}
	for _, c := range cases {
		taken, found := ReadUntil(c.tokens, c.stop)
		if found != c.found || !slices.Equal(taken, c.taken) {
			t.Errorf("ReadUntil(%v, %q) = (%v, %v), attendu (%v, %v) — %s", c.tokens, c.stop, taken, found, c.taken, c.found, c.why)
		}
	}
}

func TestSumEveryNth(t *testing.T) {
	xs := []int{10, 20, 30, 40, 50, 60, 70}
	cases := []struct{ start, step, want int }{
		{0, 1, 280}, {0, 2, 160}, {1, 2, 120}, {1, 3, 20 + 50}, {6, 5, 70}, {7, 1, 0}, {100, 1, 0}, {0, 0, 0}, {0, -1, 0}, {-1, 1, 0},
	}
	for _, c := range cases {
		if got := SumEveryNth(xs, c.start, c.step); got != c.want {
			t.Errorf("SumEveryNth(xs, %d, %d) = %d, attendu %d", c.start, c.step, got, c.want)
		}
	}
	if got := SumEveryNth(nil, 0, 1); got != 0 {
		t.Errorf("SumEveryNth(nil, 0, 1) = %d, attendu 0", got)
	}
}
