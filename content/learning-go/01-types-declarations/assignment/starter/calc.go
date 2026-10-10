package lab

import "errors"

var (
	ErrSyntax         = errors.New("expression mal formée")
	ErrRange          = errors.New("opérande hors de la plage")
	ErrOverflow       = errors.New("débordement")
	ErrDivisionByZero = errors.New("division par zéro")
	ErrWidth          = errors.New("largeur non supportée")
)

// Eval calcule une expression « a op b » sur des entiers signés de bits bits (8, 16, 32 ou 64).
// Voir instructions.md pour les règles.
func Eval(expr string, bits int) (int64, error) {
	// TODO
	panic("à implémenter")
}
