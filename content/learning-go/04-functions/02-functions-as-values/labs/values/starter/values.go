package lab

import "errors"

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
	// TODO : une map dont les valeurs sont des fonctions anonymes
	panic("à implémenter")
}

// Eval évalue « a op b » avec la table d'opérateurs fournie.
func Eval(expr string, ops map[string]BinaryOp) (int, error) {
	// TODO
	panic("à implémenter")
}

// Apply renvoie une nouvelle slice où f est appliquée à chaque élément de xs.
func Apply(xs []int, f func(int) int) []int {
	// TODO
	panic("à implémenter")
}

// Filter renvoie, dans l'ordre, les éléments de xs pour lesquels keep renvoie true.
func Filter(xs []int, keep func(int) bool) []int {
	// TODO
	panic("à implémenter")
}

// Reduce replie xs en une valeur : acc part de initial, puis acc = f(acc, x) pour chaque x.
func Reduce(xs []int, initial int, f func(acc, x int) int) int {
	// TODO
	panic("à implémenter")
}
