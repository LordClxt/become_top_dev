package expr

import (
	"math"
	"slices"
	"testing"
)

func TestEval(t *testing.T) {
	vars := map[string]float64{"n": 4, "p": 0.01, "m": 10000, "k": 7, "keys": 1000}
	cases := []struct {
		src  string
		want float64
	}{
		{"1 + 2 * 3", 7},
		{"(1 + 2) * 3", 9},
		{"-n + 10", 6},
		{"pow(0.99, 100)", math.Pow(0.99, 100)},
		{"1 - pow(1 - p, n)", 1 - math.Pow(0.99, 4)},
		{"pow(1 - exp(-k * keys / m), k)", math.Pow(1-math.Exp(-0.7), 7)},
		{"ceil(log2(1000))", 10},
		{"max(1, min(5, 3), 2)", 3},
		{"n > 3 && p < 0.5", 1},
		{"n > 3 && p > 0.5", 0},
		{"n > 3 || p > 0.5", 1},
		{"!(n > 3)", 0},
		{"10 % 4", 2},
		{"n == 4", 1},
		{"round(2.5)", 3},
		{"abs(-3) + sqrt(16)", 7},
	}
	for _, c := range cases {
		e, err := Parse(c.src)
		if err != nil {
			t.Fatalf("%s : %v", c.src, err)
		}
		got, err := e.Eval(vars)
		if err != nil || math.Abs(got-c.want) > 1e-9 {
			t.Errorf("%s = %v, %v, attendu %v", c.src, got, err, c.want)
		}
	}
}

func TestParseRejectsUnsafe(t *testing.T) {
	for _, src := range []string{
		"", "foo(1)", "os.Exit(1)", `"texte"`, "a[0]", "x := 1", "func(){}()", "n.x", "1 << 3", "n &^ 2", "&n", "<-n", "1 ^ 2",
		"'c'", "[]int{1}", "pow(1)", "min(1)",
	} {
		if _, err := Parse(src); err == nil {
			t.Errorf("%q devrait être refusée", src)
		}
	}
	long := make([]byte, 500)
	for i := range long {
		long[i] = '1'
	}
	if _, err := Parse(string(long)); err == nil {
		t.Error("expression trop longue")
	}
	deep := ""
	for range 60 {
		deep += "("
	}
	deep += "1"
	for range 60 {
		deep += ")"
	}
	if _, err := Parse(deep); err == nil {
		t.Error("expression trop imbriquée")
	}
}

func TestEvalErrors(t *testing.T) {
	for _, src := range []string{"1 / 0", "1 % 0", "x + 1", "log(0)", "sqrt(-1)"} {
		e, err := Parse(src)
		if err != nil {
			t.Fatalf("%s : %v", src, err)
		}
		if _, err := e.Eval(map[string]float64{}); err == nil {
			t.Errorf("%s devrait échouer à l'évaluation", src)
		}
	}
}

func TestIdents(t *testing.T) {
	e, _ := Parse("pow(1 - exp(-k * n / m), k) <= target")
	got := e.Idents()
	slices.Sort(got)
	if !slices.Equal(got, []string{"k", "m", "n", "target"}) {
		t.Errorf("Idents = %v", got)
	}
}
