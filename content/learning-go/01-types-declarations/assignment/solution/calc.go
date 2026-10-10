package lab

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
)

var (
	ErrSyntax         = errors.New("expression mal formée")
	ErrRange          = errors.New("opérande hors de la plage")
	ErrOverflow       = errors.New("débordement")
	ErrDivisionByZero = errors.New("division par zéro")
	ErrWidth          = errors.New("largeur non supportée")
)

// Eval calcule une expression « a op b » sur des entiers signés de bits bits (8, 16, 32 ou 64).
func Eval(expr string, bits int) (int64, error) {
	if bits != 8 && bits != 16 && bits != 32 && bits != 64 {
		return 0, fmt.Errorf("%w : %d", ErrWidth, bits)
	}
	fields := strings.Fields(expr)
	if len(fields) != 3 {
		return 0, fmt.Errorf("%w : attendu « a op b », reçu %q", ErrSyntax, expr)
	}
	a, err := parseOperand(fields[0], bits)
	if err != nil {
		return 0, err
	}
	b, err := parseOperand(fields[2], bits)
	if err != nil {
		return 0, err
	}

	var result int64
	var ok bool
	switch fields[1] {
	case "+":
		result, ok = addChecked(a, b)
	case "-":
		result, ok = subChecked(a, b)
	case "*":
		result, ok = mulChecked(a, b)
	case "/", "%":
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		if a == math.MinInt64 && b == -1 {
			ok = false
		} else if fields[1] == "/" {
			result, ok = a/b, true
		} else {
			result, ok = a%b, true
		}
	default:
		return 0, fmt.Errorf("%w : opérateur %q inconnu", ErrSyntax, fields[1])
	}

	min, max := bounds(bits)
	if !ok || result < min || result > max {
		return 0, fmt.Errorf("%w : %q ne tient pas dans un int%d", ErrOverflow, expr, bits)
	}
	return result, nil
}

func bounds(bits int) (min, max int64) {
	return -1 << (bits - 1), 1<<(bits-1) - 1
}

func parseOperand(s string, bits int) (int64, error) {
	digits := strings.TrimPrefix(s, "-")
	if digits == "" || strings.Trim(digits, "0123456789") != "" {
		return 0, fmt.Errorf("%w : %q n'est pas un entier décimal", ErrSyntax, s)
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%w : %q dépasse int64", ErrRange, s)
	}
	if min, max := bounds(bits); n < min || n > max {
		return 0, fmt.Errorf("%w : %d ne tient pas dans un int%d", ErrRange, n, bits)
	}
	return n, nil
}

func addChecked(a, b int64) (int64, bool) {
	sum := a + b
	return sum, !((a > 0 && b > 0 && sum < 0) || (a < 0 && b < 0 && sum >= 0))
}

func subChecked(a, b int64) (int64, bool) {
	diff := a - b
	return diff, !((a >= 0 && b < 0 && diff < 0) || (a < 0 && b > 0 && diff >= 0))
}

func mulChecked(a, b int64) (int64, bool) {
	if a == 0 || b == 0 {
		return 0, true
	}
	product := a * b
	if (a == -1 && b == math.MinInt64) || (b == -1 && a == math.MinInt64) {
		return product, false
	}
	return product, product/b == a
}
