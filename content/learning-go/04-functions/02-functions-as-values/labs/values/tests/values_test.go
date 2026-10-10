package lab

import (
	"errors"
	"math"
	"slices"
	"testing"
)

func TestEval(t *testing.T) {
	ops := Operators()
	cases := []struct {
		expr string
		want int
	}{
		{"2 + 3", 5}, {"2 - 3", -1}, {"6 * 7", 42}, {"7 / 2", 3}, {"-7 / 2", -3}, {"7 % 3", 1}, {"-7 % 3", -1},
		{"  10   +   5 ", 15}, {"0 * 99", 0}, {"-3 - -3", 0},
	}
	for _, c := range cases {
		got, err := Eval(c.expr, ops)
		if err != nil || got != c.want {
			t.Errorf("Eval(%q) = (%d, %v), attendu %d", c.expr, got, err, c.want)
		}
	}
}

func TestEvalErrors(t *testing.T) {
	ops := Operators()
	cases := []struct {
		expr string
		want error
		why  string
	}{
		{"1 / 0", ErrDivisionByZero, "l'erreur de l'opérateur doit remonter telle quelle"},
		{"1 % 0", ErrDivisionByZero, "idem pour %"},
		{"2 ^ 3", ErrOperator, "opérateur absent de la table"},
		{"two + 3", ErrFormat, "premier opérande illisible"},
		{"3 + three", ErrFormat, "second opérande illisible"},
		{"5", ErrFormat, "un seul élément"},
		{"1 + 2 + 3", ErrFormat, "trop d'éléments"},
		{"", ErrFormat, "expression vide"},
		{"1 +", ErrFormat, "opérande manquant"},
	}
	for _, c := range cases {
		if got, err := Eval(c.expr, ops); !errors.Is(err, c.want) {
			t.Errorf("Eval(%q) = (%d, %v), attendu l'erreur %v — %s", c.expr, got, err, c.want, c.why)
		}
	}
	if _, err := Eval("1 + 2", nil); !errors.Is(err, ErrOperator) {
		t.Errorf("Eval avec une table nil : erreur %v, attendu ErrOperator (lire une map nil est permis)", err)
	}
}

func TestEvalCustomOperators(t *testing.T) {
	ops := Operators()
	ops["**"] = func(a, b int) (int, error) {
		result := 1
		for i := 0; i < b; i++ {
			result *= a
		}
		return result, nil
	}
	ops["max"] = func(a, b int) (int, error) { return max(a, b), nil }
	ops["fail"] = func(a, b int) (int, error) { return 0, errors.New("échec voulu") }

	if got, err := Eval("2 ** 10", ops); err != nil || got != 1024 {
		t.Errorf("Eval(2 ** 10) = (%d, %v), attendu 1024", got, err)
	}
	if got, err := Eval("3 max 9", ops); err != nil || got != 9 {
		t.Errorf("Eval(3 max 9) = (%d, %v), attendu 9", got, err)
	}
	if _, err := Eval("1 fail 2", ops); err == nil || err.Error() != "échec voulu" {
		t.Errorf("l'erreur d'un opérateur personnalisé doit remonter : %v", err)
	}
}

func TestOperatorsReturnsAFreshMap(t *testing.T) {
	first := Operators()
	first["+"] = func(a, b int) (int, error) { return 0, errors.New("sabotage") }
	delete(first, "-")

	second := Operators()
	if got, err := Eval("2 + 3", second); err != nil || got != 5 {
		t.Errorf("une modification de la première table a contaminé la seconde : (%d, %v)", got, err)
	}
	if _, ok := second["-"]; !ok {
		t.Errorf("la seconde table doit contenir « - »")
	}
	for _, symbol := range []string{"+", "-", "*", "/", "%"} {
		if second[symbol] == nil {
			t.Errorf("l'opérateur %q est absent", symbol)
		}
	}
}

func TestApply(t *testing.T) {
	xs := []int{1, 2, 3}
	if got := Apply(xs, func(x int) int { return x * x }); !slices.Equal(got, []int{1, 4, 9}) {
		t.Errorf("Apply carré = %v", got)
	}
	if !slices.Equal(xs, []int{1, 2, 3}) {
		t.Errorf("Apply a modifié son entrée : %v", xs)
	}
	offset := 100
	if got := Apply(xs, func(x int) int { return x + offset }); !slices.Equal(got, []int{101, 102, 103}) {
		t.Errorf("Apply doit accepter une fonction qui utilise une variable extérieure : %v", got)
	}
	if got := Apply(nil, func(x int) int { return x }); len(got) != 0 {
		t.Errorf("Apply(nil) = %v, attendu vide", got)
	}
}

func TestFilter(t *testing.T) {
	even := func(x int) bool { return x%2 == 0 }
	if got := Filter([]int{1, 2, 3, 4, 5, 6}, even); !slices.Equal(got, []int{2, 4, 6}) {
		t.Errorf("Filter pairs = %v", got)
	}
	if got := Filter([]int{1, 3, 5}, even); len(got) != 0 {
		t.Errorf("Filter sans résultat = %v, attendu vide", got)
	}
	if got := Filter(nil, even); len(got) != 0 {
		t.Errorf("Filter(nil) = %v", got)
	}
	xs := []int{5, 6, 7, 8}
	_ = Filter(xs, even)
	if !slices.Equal(xs, []int{5, 6, 7, 8}) {
		t.Errorf("Filter a modifié son entrée : %v", xs)
	}
	calls := 0
	Filter([]int{1, 2, 3}, func(int) bool { calls++; return true })
	if calls != 3 {
		t.Errorf("keep doit être appelée une fois par élément, pas %d fois", calls)
	}
}

func TestReduce(t *testing.T) {
	add := func(acc, x int) int { return acc + x }
	mul := func(acc, x int) int { return acc * x }
	if got := Reduce([]int{1, 2, 3, 4}, 0, add); got != 10 {
		t.Errorf("somme = %d", got)
	}
	if got := Reduce([]int{1, 2, 3, 4}, 1, mul); got != 24 {
		t.Errorf("produit = %d", got)
	}
	if got := Reduce([]int{3, 9, 2}, math.MinInt, func(acc, x int) int { return max(acc, x) }); got != 9 {
		t.Errorf("maximum = %d", got)
	}
	if got := Reduce(nil, 42, add); got != 42 {
		t.Errorf("Reduce de rien doit renvoyer la valeur initiale, reçu %d", got)
	}
	if got := Reduce([]int{1, 2, 3}, 0, func(acc, x int) int { return acc*10 + x }); got != 123 {
		t.Errorf("l'ordre compte : attendu 123, reçu %d", got)
	}
}
