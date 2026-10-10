package lab

import "errors"

// MinMax renvoie la plus petite et la plus grande des valeurs. ok vaut false s'il n'y a aucune valeur.
// (Les retours se nomment lo et hi : min et max masqueraient des identifiants prédéclarés.)
func MinMax(vals ...int) (lo, hi int, ok bool) {
	// TODO
	panic("à implémenter")
}

// ErrNoValues est renvoyée par Stats quand on ne lui passe aucune valeur.
var ErrNoValues = errors.New("aucune valeur")

// Stats renvoie la moyenne et la médiane des valeurs. Elle ne modifie jamais les valeurs de l'appelant.
func Stats(vals ...float64) (mean, median float64, err error) {
	// TODO
	panic("à implémenter")
}

// FormatOptions remplace des paramètres nommés et optionnels.
type FormatOptions struct {
	Prefix    string // ajouté devant chaque élément
	Separator string // « , » si vide
	Max       int    // nombre maximum d'éléments affichés ; 0 ou moins = pas de limite
}

// Join assemble items selon opts. Quand il y a plus de Max éléments, les premiers sont affichés,
// suivis de « …(+N) » où N est le nombre d'éléments omis.
func Join(items []string, opts FormatOptions) string {
	// TODO
	panic("à implémenter")
}
