package lab

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

// Atom est un prédicat appliqué à des arguments : within(idaho, usa).
// Un argument qui commence par une majuscule est une variable ; sinon c'est une constante.
type Atom struct {
	Pred string
	Args []string
}

// Rule signifie « Head est vrai si tous les atomes de Body sont vrais » (Head :- Body[0], Body[1], …).
type Rule struct {
	Head Atom
	Body []Atom
}

// String renvoie la forme canonique « pred(a, b) ».
func (a Atom) String() string {
	return a.Pred + "(" + strings.Join(a.Args, ", ") + ")"
}

// isVar indique si un argument est une variable (première lettre en majuscule).
func isVar(s string) bool {
	r, _ := utf8.DecodeRuneInString(s)
	return unicode.IsUpper(r)
}

// Eval applique les règles aux faits jusqu'au point fixe et renvoie tous les faits (de départ et dérivés),
// sans doublon, triés par leur forme String(). Les règles non sûres (une variable de la tête absente du corps)
// sont ignorées. Les faits d'entrée sont des atomes sans variable.
func Eval(facts []Atom, rules []Rule) []Atom {
	// TODO
	panic("à implémenter")
}

// Query renvoie, pour chaque fait de db qui correspond au motif, l'association variable → valeur.
// Les résultats sont sans doublon, dans l'ordre des faits triés par String(). Un motif sans variable qui
// correspond donne une unique association vide ; sans correspondance, une slice vide (non nil).
// Une variable répétée dans le motif (p(X, X)) doit recevoir la même valeur partout.
func Query(db []Atom, pattern Atom) []map[string]string {
	// TODO
	panic("à implémenter")
}
