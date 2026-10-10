package lab

import (
	"errors"
	"slices"
	"strconv"
	"strings"
)

// MinMax renvoie la plus petite et la plus grande des valeurs. ok vaut false s'il n'y a aucune valeur.
// (Les retours se nomment lo et hi : min et max masqueraient des identifiants prédéclarés.)
func MinMax(vals ...int) (lo, hi int, ok bool) {
	if len(vals) == 0 {
		return 0, 0, false
	}
	lo, hi = vals[0], vals[0]
	for _, v := range vals[1:] {
		lo = min(lo, v)
		hi = max(hi, v)
	}
	return lo, hi, true
}

// ErrNoValues est renvoyée par Stats quand on ne lui passe aucune valeur.
var ErrNoValues = errors.New("aucune valeur")

// Stats renvoie la moyenne et la médiane des valeurs. Elle ne modifie jamais les valeurs de l'appelant.
func Stats(vals ...float64) (mean, median float64, err error) {
	if len(vals) == 0 {
		return 0, 0, ErrNoValues
	}
	sorted := slices.Clone(vals) // trier vals trierait la slice de l'appelant quand il passe xs...
	slices.Sort(sorted)

	sum := 0.0
	for _, v := range sorted {
		sum += v
	}
	mean = sum / float64(len(sorted))

	if mid := len(sorted) / 2; len(sorted)%2 == 1 {
		median = sorted[mid]
	} else {
		median = (sorted[mid-1] + sorted[mid]) / 2
	}
	return mean, median, nil
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
	sep := opts.Separator
	if sep == "" {
		sep = ","
	}
	omitted := 0
	if opts.Max > 0 && len(items) > opts.Max {
		omitted = len(items) - opts.Max
		items = items[:opts.Max]
	}
	parts := make([]string, 0, len(items)+1)
	for _, item := range items {
		parts = append(parts, opts.Prefix+item)
	}
	if omitted > 0 {
		parts = append(parts, "…(+"+strconv.Itoa(omitted)+")")
	}
	return strings.Join(parts, sep)
}
