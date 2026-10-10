package lab

import (
	"errors"
	"testing"
)

type evalCase struct {
	expr string
	bits int
	want int64
	err  error
	why  string
}

func runCases(t *testing.T, cases []evalCase) {
	t.Helper()
	for _, c := range cases {
		got, err := Eval(c.expr, c.bits)
		if c.err != nil {
			if !errors.Is(err, c.err) {
				t.Errorf("Eval(%q, %d) = (%d, %v), attendu l'erreur %v — %s", c.expr, c.bits, got, err, c.err, c.why)
			}
			continue
		}
		if err != nil || got != c.want {
			t.Errorf("Eval(%q, %d) = (%d, %v), attendu %d — %s", c.expr, c.bits, got, err, c.want, c.why)
		}
	}
}

func TestEvalInt8(t *testing.T) {
	runCases(t, []evalCase{
		{"127 + 0", 8, 127, nil, "le maximum tient"},
		{"127 + 1", 8, 0, ErrOverflow, "128 sort de int8"},
		{"-128 - 0", 8, -128, nil, "le minimum tient"},
		{"-128 - 1", 8, 0, ErrOverflow, "-129 sort de int8"},
		{"16 * 7", 8, 112, nil, "112 tient"},
		{"16 * 8", 8, 0, ErrOverflow, "128 sort de int8"},
		{"-16 * 8", 8, -128, nil, "-128 tient"},
		{"100 / 7", 8, 14, nil, "division entière"},
		{"-100 / 7", 8, -14, nil, "tronquée vers zéro"},
		{"100 % 7", 8, 2, nil, "reste"},
		{"-100 % 7", 8, -2, nil, "le reste prend le signe du dividende"},
		{"-128 / -1", 8, 0, ErrOverflow, "128 sort de int8 : cas piège de la division"},
		{"5 / 0", 8, 0, ErrDivisionByZero, "division par zéro"},
		{"5 % 0", 8, 0, ErrDivisionByZero, "reste par zéro"},
		{"200 + 1", 8, 0, ErrRange, "l'opérande 200 ne tient pas dans un int8"},
		{"-129 + 1", 8, 0, ErrRange, "l'opérande -129 ne tient pas dans un int8"},
		{"  12   +   30 ", 8, 42, nil, "les espaces multiples sont tolérés"},
	})
}

func TestEvalWiderTypes(t *testing.T) {
	runCases(t, []evalCase{
		{"32767 + 1", 16, 0, ErrOverflow, "int16"},
		{"300 * 100", 16, 30000, nil, "int16, tient"},
		{"300 * 110", 16, 0, ErrOverflow, "33000 sort de int16"},
		{"2147483647 + 1", 32, 0, ErrOverflow, "int32"},
		{"46340 * 46340", 32, 2147395600, nil, "int32, tient"},
		{"46341 * 46341", 32, 0, ErrOverflow, "2147488281 sort de int32"},
		{"-2147483648 - 1", 32, 0, ErrOverflow, "int32, par le bas"},
	})
}

func TestEvalInt64(t *testing.T) {
	runCases(t, []evalCase{
		{"9223372036854775807 - 1", 64, 9223372036854775806, nil, "tient"},
		{"9223372036854775807 + 1", 64, 0, ErrOverflow, "il n'existe pas de type plus large : le débordement doit se détecter autrement"},
		{"-9223372036854775808 - 1", 64, 0, ErrOverflow, "par le bas"},
		{"-9223372036854775808 + 0", 64, -9223372036854775808, nil, "le minimum tient"},
		{"-9223372036854775808 / -1", 64, 0, ErrOverflow, "le seul quotient d'int64 qui déborde"},
		{"-9223372036854775808 * -1", 64, 0, ErrOverflow, "le produit déborde"},
		{"-9223372036854775808 * 1", 64, -9223372036854775808, nil, "le produit tient"},
		{"3037000499 * 3037000499", 64, 9223372030926249001, nil, "juste sous la limite"},
		{"3037000500 * 3037000500", 64, 0, ErrOverflow, "juste au-dessus de la limite"},
		{"4611686018427387904 * 2", 64, 0, ErrOverflow, "2^62 * 2 = 2^63"},
		{"4611686018427387904 * -2", 64, -9223372036854775808, nil, "-2^63 tient"},
		{"9223372036854775808 + 0", 64, 0, ErrRange, "l'opérande dépasse int64"},
	})
}

func TestEvalSyntaxErrors(t *testing.T) {
	for _, expr := range []string{"", "1", "1 +", "1 + 2 + 3", "1+2", "a + 1", "1 ^ 2", "1 + 1.5", "1 + +2", "0x10 + 1", "1_0 + 1", "- + 1", "1 + -"} {
		if got, err := Eval(expr, 32); !errors.Is(err, ErrSyntax) {
			t.Errorf("Eval(%q, 32) = (%d, %v), attendu ErrSyntax", expr, got, err)
		}
	}
}

func TestEvalUnsupportedWidth(t *testing.T) {
	for _, bits := range []int{0, 4, 12, 128, -8} {
		if _, err := Eval("1 + 1", bits); !errors.Is(err, ErrWidth) {
			t.Errorf("Eval(\"1 + 1\", %d) : attendu ErrWidth, reçu %v", bits, err)
		}
	}
}
