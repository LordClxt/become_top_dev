package lab

import (
	"errors"
	"math"
	"testing"
)

func approx(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestEvalValues(t *testing.T) {
	vars := map[string]float64{"x": 3, "y": 4, "pi": math.Pi, "zero": 0}
	cases := []struct {
		expr string
		want float64
		why  string
	}{
		{"7", 7, "un nombre"},
		{"  42  ", 42, "espaces ignorés"},
		{"3.25", 3.25, "décimal"},
		{"1 + 2 * 3", 7, "priorité de *"},
		{"(1 + 2) * 3", 9, "parenthèses"},
		{"10 - 3 - 2", 5, "- s'associe à gauche"},
		{"100 / 10 / 5", 2, "/ s'associe à gauche"},
		{"10 / 4", 2.5, "division décimale"},
		{"0.1 + 0.2", 0.3, "approximation flottante"},
		{"2 * (3 + 4) * 5", 70, "plusieurs facteurs"},
		{"((((5))))", 5, "parenthèses imbriquées"},
		{"2 ^ 3", 8, "puissance"},
		{"2 ^ 3 ^ 2", 512, "^ s'associe à droite : 2^(3^2)"},
		{"-2 ^ 2", -4, "le moins unaire s'applique après la puissance"},
		{"(-2) ^ 2", 4, "parenthèses autour du négatif"},
		{"2 ^ -1", 0.5, "exposant négatif"},
		{"2 * 3 ^ 2", 18, "^ passe avant *"},
		{"--3", 3, "double moins"},
		{"3 - -3", 6, "soustraire un négatif"},
		{"-(2 + 3)", -5, "moins devant une parenthèse"},
		{"2 * -3", -6, "moins après une multiplication"},
		{"max(1, 5, 3)", 5, "max variadique"},
		{"max(7)", 7, "max d'un seul argument"},
		{"min(4, 2)", 2, "min"},
		{"sum()", 0, "sum sans argument vaut 0"},
		{"sum(1, 2, 3, 4)", 10, "sum"},
		{"abs(-7.5)", 7.5, "abs"},
		{"sqrt(16)", 4, "sqrt"},
		{"avg(1, 2, 3, 4)", 2.5, "avg"},
		{"pow(2, 10)", 1024, "pow"},
		{"max(1, min(5, 3) * 2)", 6, "appels imbriqués"},
		{"sqrt(abs(-9)) + 1", 4, "composition"},
		{"abs(-2) ^ 3", 8, "puissance d'un appel de fonction"},
		{"max( 1 ,2 )", 2, "espaces dans l'appel"},
		{"x * 2 + y", 10, "variables"},
		{"2 * pi", 2 * math.Pi, "constante fournie par l'appelant"},
		{"max(x, y, 10) - min(x, y)", 7, "variables dans des appels"},
		{"x ^ 2 + y ^ 2", 25, "x² + y²"},
		{"sqrt(x ^ 2 + y ^ 2)", 5, "hypoténuse"},
		{"zero * 5", 0, "variable nulle"},
	}
	for _, c := range cases {
		got, err := Eval(c.expr, vars)
		if err != nil || !approx(got, c.want) {
			t.Errorf("Eval(%q) = (%v, %v), attendu %v — %s", c.expr, got, err, c.want, c.why)
		}
	}
}

func TestEvalWithoutVariables(t *testing.T) {
	if got, err := Eval("1 + 1", nil); err != nil || got != 2 {
		t.Errorf("Eval avec une map nil = (%v, %v)", got, err)
	}
}

func expectError(t *testing.T, want error, exprs ...string) {
	t.Helper()
	for _, expr := range exprs {
		if got, err := Eval(expr, map[string]float64{"x": 1}); !errors.Is(err, want) {
			t.Errorf("Eval(%q) = (%v, %v), attendu l'erreur %v", expr, got, err, want)
		}
	}
}

func TestEvalSyntaxErrors(t *testing.T) {
	expectError(t, ErrSyntax,
		"", "   ", "1 +", "+ 1", "* 2", "(1 + 2", "1 + 2)", "1 2", "()", "2 +* 3", "2 ** 3",
		"max(1,)", "max(,1)", "max(1 2)", "sum(1,2", ".5", "5.", "1 . 5", "3 $ 4", "1 + (2 * )", "^ 2", "2 ^", "x y",
	)
}

func TestEvalUnknownNames(t *testing.T) {
	expectError(t, ErrUnknownName, "y", "foo(1)", "x + z", "max", "pi * 2", "2 * unknown(3)", "x(2)")
}

func TestEvalDivisionByZero(t *testing.T) {
	expectError(t, ErrDivisionByZero, "1 / 0", "5 / (3 - 3)", "1 / sum()", "x / (x - x)", "2 * 3 / 0")
}

func TestEvalDomainErrors(t *testing.T) {
	expectError(t, ErrDomain, "sqrt(-1)", "0 ^ -1", "(-8) ^ 0.5", "pow(0, -2)", "sqrt(1 - 2)")
}

func TestEvalArityErrors(t *testing.T) {
	expectError(t, ErrArity, "abs()", "abs(1, 2)", "sqrt(1, 2)", "sqrt()", "pow(2)", "pow(1, 2, 3)", "max()", "min()", "avg()")
}

func TestEvalDoesNotModifyVariables(t *testing.T) {
	vars := map[string]float64{"x": 2}
	if _, err := Eval("x * x + x", vars); err != nil {
		t.Fatal(err)
	}
	if len(vars) != 1 || vars["x"] != 2 {
		t.Errorf("Eval a modifié les variables de l'appelant : %v", vars)
	}
}

func TestEvalIsRepeatable(t *testing.T) {
	for i := 0; i < 3; i++ {
		if got, err := Eval("max(1, 2) + 3 ^ 2", nil); err != nil || got != 11 {
			t.Fatalf("appel %d : (%v, %v), attendu 11 — pas d'état partagé entre les appels", i+1, got, err)
		}
	}
}
