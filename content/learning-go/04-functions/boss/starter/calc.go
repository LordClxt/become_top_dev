package lab

import "errors"

var (
	ErrSyntax         = errors.New("syntaxe invalide")
	ErrUnknownName    = errors.New("nom inconnu")
	ErrDivisionByZero = errors.New("division par zéro")
	ErrDomain         = errors.New("hors du domaine")
	ErrArity          = errors.New("mauvais nombre d'arguments")
)

// Eval calcule une expression arithmétique. Voir instructions.md pour la grammaire,
// les fonctions disponibles et les erreurs.
func Eval(expression string, vars map[string]float64) (float64, error) {
	// TODO
	panic("à implémenter")
}
