package lab

import "errors"

// Percentile renvoie le p-ième percentile (0 < p <= 100) de samples par la méthode du rang le plus proche :
// on trie, puis on prend l'élément de rang ceil(p/100 × n). samples ne doit pas être modifié.
// Sans échantillon, le résultat est 0.
func Percentile(samples []float64, p float64) float64 {
	// TODO
	panic("à implémenter")
}

// TailProbability renvoie la probabilité qu'au moins un de n appels indépendants soit lent,
// quand chacun l'est avec la probabilité p.
func TailProbability(p float64, n int) float64 {
	// TODO
	panic("à implémenter")
}

// Histogram compte des durées par tranches. bounds[i] est la borne haute (incluse) de la tranche i ;
// une dernière tranche implicite recueille tout ce qui dépasse la dernière borne.
type Histogram struct {
	bounds []float64
	counts []int // len(bounds)+1
	total  int
}

// NewHistogram crée un histogramme vide. bounds est strictement croissant.
func NewHistogram(bounds []float64) *Histogram {
	// TODO
	panic("à implémenter")
}

// Observe range la durée v dans sa tranche.
func (h *Histogram) Observe(v float64) {
	// TODO
	panic("à implémenter")
}

// Count renvoie le nombre total d'observations.
func (h *Histogram) Count() int {
	// TODO
	panic("à implémenter")
}

// ErrBoundsMismatch est renvoyée quand on fusionne deux histogrammes aux tranches différentes.
var ErrBoundsMismatch = errors.New("tranches différentes")

// Merge ajoute les comptes de other à h, tranche par tranche.
// Si les bornes diffèrent, renvoie ErrBoundsMismatch sans rien modifier.
func (h *Histogram) Merge(other *Histogram) error {
	// TODO
	panic("à implémenter")
}

// Quantile renvoie la borne haute de la tranche qui contient le p-ième percentile.
// Si ce percentile tombe dans la tranche de débordement, renvoie math.Inf(1). Sans observation, 0.
func (h *Histogram) Quantile(p float64) float64 {
	// TODO
	panic("à implémenter")
}
