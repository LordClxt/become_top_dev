package lab

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// BinaryOp est une opération sur deux entiers qui peut échouer.
type BinaryOp func(a, b int) (int, error)

var (
	ErrFormat         = errors.New("expression mal formée")
	ErrOperator       = errors.New("opérateur inconnu")
	ErrDivisionByZero = errors.New("division par zéro")
)

// Operators renvoie une nouvelle table d'opérateurs : + - * / %.
// Chaque appel renvoie une map indépendante, que l'appelant peut compléter à sa guise.
func Operators() map[string]BinaryOp {
	return map[string]BinaryOp{
		"+": func(a, b int) (int, error) { return a + b, nil },
		"-": func(a, b int) (int, error) { return a - b, nil },
		"*": func(a, b int) (int, error) { return a * b, nil },
		"/": func(a, b int) (int, error) {
			if b == 0 {
				return 0, ErrDivisionByZero
			}
			return a / b, nil
		},
		"%": func(a, b int) (int, error) {
			if b == 0 {
				return 0, ErrDivisionByZero
			}
			return a % b, nil
		},
	}
}

// Eval évalue « a op b » avec la table d'opérateurs fournie.
func Eval(expr string, ops map[string]BinaryOp) (int, error) {
	fields := strings.Fields(expr)
	if len(fields) != 3 {
		return 0, fmt.Errorf("%w : %q (attendu « a op b »)", ErrFormat, expr)
	}
	a, err := strconv.Atoi(fields[0])
	if err != nil {
		return 0, fmt.Errorf("%w : %q n'est pas un entier", ErrFormat, fields[0])
	}
	b, err := strconv.Atoi(fields[2])
	if err != nil {
		return 0, fmt.Errorf("%w : %q n'est pas un entier", ErrFormat, fields[2])
	}
	op, ok := ops[fields[1]]
	if !ok {
		return 0, fmt.Errorf("%w : %q", ErrOperator, fields[1])
	}
	return op(a, b)
}

// Apply renvoie une nouvelle slice où f est appliquée à chaque élément de xs.
func Apply(xs []int, f func(int) int) []int {
	out := make([]int, len(xs))
	for i, x := range xs {
		out[i] = f(x)
	}
	return out
}

// Filter renvoie, dans l'ordre, les éléments de xs pour lesquels keep renvoie true.
func Filter(xs []int, keep func(int) bool) []int {
	out := []int{}
	for _, x := range xs {
		if keep(x) {
			out = append(out, x)
		}
	}
	return out
}

// Reduce replie xs en une valeur : acc part de initial, puis acc = f(acc, x) pour chaque x.
func Reduce(xs []int, initial int, f func(acc, x int) int) int {
	acc := initial
	for _, x := range xs {
		acc = f(acc, x)
	}
	return acc
}
