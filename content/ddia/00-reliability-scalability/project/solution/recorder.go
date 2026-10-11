package lab

import (
	"errors"
	"maps"
	"math"
	"slices"
	"sort"
	"time"
)

// ErrBoundsMismatch est renvoyée quand on fusionne deux Recorder aux tranches différentes.
var ErrBoundsMismatch = errors.New("tranches différentes")

// Recorder mesure les durées des opérations de Tinybase, par nom d'opération, dans des histogrammes.
type Recorder struct {
	bounds []float64 // bornes hautes incluses, en millisecondes
	ops    map[string][]int
}

// NewRecorder crée un Recorder. bounds (strictement croissant, en ms) est copié.
func NewRecorder(bounds []float64) *Recorder {
	return &Recorder{bounds: slices.Clone(bounds), ops: map[string][]int{}}
}

func (r *Recorder) counts(op string) []int {
	c, ok := r.ops[op]
	if !ok {
		c = make([]int, len(r.bounds)+1)
		r.ops[op] = c
	}
	return c
}

// Record enregistre la durée d de l'opération op.
func (r *Recorder) Record(op string, d time.Duration) {
	ms := float64(d) / float64(time.Millisecond)
	r.counts(op)[sort.SearchFloat64s(r.bounds, ms)]++
}

// Count renvoie le nombre de mesures de op (0 si inconnue).
func (r *Recorder) Count(op string) int {
	total := 0
	for _, c := range r.ops[op] {
		total += c
	}
	return total
}

// Quantile renvoie la borne haute (ms) de la tranche contenant le p-ième percentile de op,
// +Inf si c'est la tranche de débordement, 0 si op n'a aucune mesure.
func (r *Recorder) Quantile(op string, p float64) float64 {
	total := r.Count(op)
	if total == 0 {
		return 0
	}
	rank := min(max(int(math.Ceil(p/100*float64(total))), 1), total)
	seen := 0
	for i, c := range r.ops[op] {
		seen += c
		if seen >= rank {
			if i == len(r.bounds) {
				return math.Inf(1)
			}
			return r.bounds[i]
		}
	}
	return math.Inf(1)
}

// Ops renvoie les noms des opérations mesurées, triés.
func (r *Recorder) Ops() []string {
	return slices.Sorted(maps.Keys(r.ops))
}

// Merge ajoute les mesures de other à r (tranche par tranche), y compris les opérations que r ne connaissait pas.
// other n'est pas modifié. Si les bornes diffèrent, renvoie ErrBoundsMismatch sans rien modifier.
func (r *Recorder) Merge(other *Recorder) error {
	if !slices.Equal(r.bounds, other.bounds) {
		return ErrBoundsMismatch
	}
	for op, theirs := range other.ops {
		mine := r.counts(op)
		for i, c := range theirs {
			mine[i] += c
		}
	}
	return nil
}

// SLO est un objectif sur une opération : le percentile Percentile doit rester ≤ MaxMs, et la
// disponibilité visée est Availability (par exemple 0,999).
type SLO struct {
	Op           string
	Percentile   float64
	MaxMs        float64
	Availability float64
}

// Verdict est le résultat de la vérification d'un SLO.
type Verdict struct {
	Op              string
	ObservedMs      float64 // valeur observée du percentile visé
	LatencyMet      bool    // ObservedMs <= MaxMs
	BudgetRemaining int     // échecs encore tolérés (négatif si le budget est dépassé)
}

// Evaluate vérifie slo à partir des mesures de r et du nombre failed de requêtes en échec.
// Le budget d'erreur est floor((1 − Availability) × Count) − failed ; ajoute 1e-9 avant floor
// pour absorber l'erreur d'arrondi des flottants.
func (r *Recorder) Evaluate(slo SLO, failed int) Verdict {
	observed := r.Quantile(slo.Op, slo.Percentile)
	allowed := int(math.Floor((1-slo.Availability)*float64(r.Count(slo.Op)) + 1e-9))
	return Verdict{
		Op:              slo.Op,
		ObservedMs:      observed,
		LatencyMet:      observed <= slo.MaxMs,
		BudgetRemaining: allowed - failed,
	}
}
