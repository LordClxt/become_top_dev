package lab

import (
	"errors"
	"math"
	"slices"
	"sort"
)

// Percentile renvoie le p-ième percentile (0 < p <= 100) de samples par la méthode du rang le plus proche :
// on trie, puis on prend l'élément de rang ceil(p/100 × n). samples n'est pas modifié.
// Sans échantillon, le résultat est 0.
func Percentile(samples []float64, p float64) float64 {
	if len(samples) == 0 {
		return 0
	}
	sorted := slices.Clone(samples)
	slices.Sort(sorted)
	rank := int(math.Ceil(p / 100 * float64(len(sorted))))
	rank = min(max(rank, 1), len(sorted))
	return sorted[rank-1]
}

// TailProbability renvoie la probabilité qu'au moins un de n appels indépendants soit lent,
// quand chacun l'est avec la probabilité p.
func TailProbability(p float64, n int) float64 {
	return 1 - math.Pow(1-p, float64(n))
}

// Histogram compte des durées par tranches. Bounds[i] est la borne haute (incluse) de la tranche i ;
// une dernière tranche implicite recueille tout ce qui dépasse la dernière borne.
type Histogram struct {
	bounds []float64
	counts []int // len(bounds)+1
	total  int
}

// NewHistogram crée un histogramme vide. bounds est strictement croissant.
func NewHistogram(bounds []float64) *Histogram {
	return &Histogram{bounds: slices.Clone(bounds), counts: make([]int, len(bounds)+1)}
}

// Observe range la durée v dans sa tranche.
func (h *Histogram) Observe(v float64) {
	i := sort.SearchFloat64s(h.bounds, v) // première borne >= v
	h.counts[i]++
	h.total++
}

// Count renvoie le nombre total d'observations.
func (h *Histogram) Count() int { return h.total }

// ErrBoundsMismatch est renvoyée quand on fusionne deux histogrammes aux tranches différentes.
var ErrBoundsMismatch = errors.New("tranches différentes")

// Merge ajoute les comptes de other à h, tranche par tranche.
func (h *Histogram) Merge(other *Histogram) error {
	if !slices.Equal(h.bounds, other.bounds) {
		return ErrBoundsMismatch
	}
	for i, c := range other.counts {
		h.counts[i] += c
	}
	h.total += other.total
	return nil
}

// Quantile renvoie la borne haute de la tranche qui contient le p-ième percentile.
// Si ce percentile tombe dans la tranche de débordement, renvoie +Inf. Sans observation, 0.
func (h *Histogram) Quantile(p float64) float64 {
	if h.total == 0 {
		return 0
	}
	rank := int(math.Ceil(p / 100 * float64(h.total)))
	rank = min(max(rank, 1), h.total)
	seen := 0
	for i, c := range h.counts {
		seen += c
		if seen >= rank {
			if i == len(h.bounds) {
				return math.Inf(1)
			}
			return h.bounds[i]
		}
	}
	return math.Inf(1)
}
