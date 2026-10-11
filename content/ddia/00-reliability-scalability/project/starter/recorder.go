package lab

import (
	"errors"
	"time"
)

// ErrBoundsMismatch est renvoyée quand on fusionne deux Recorder aux tranches différentes.
var ErrBoundsMismatch = errors.New("tranches différentes")

// Recorder mesure les durées des opérations de Tinybase, par nom d'opération, dans des histogrammes.
type Recorder struct {
	bounds []float64 // bornes hautes incluses, en millisecondes
	ops    map[string][]int
}

// --- Jalon 1 : enregistrer et lire ---

// NewRecorder crée un Recorder. bounds (strictement croissant, en ms) est copié.
func NewRecorder(bounds []float64) *Recorder {
	// TODO
	panic("à implémenter")
}

// Record enregistre la durée d de l'opération op (tranche : première borne >= durée en ms, sinon débordement).
func (r *Recorder) Record(op string, d time.Duration) {
	// TODO
	panic("à implémenter")
}

// Count renvoie le nombre de mesures de op (0 si inconnue).
func (r *Recorder) Count(op string) int {
	// TODO
	panic("à implémenter")
}

// Quantile renvoie la borne haute (ms) de la tranche contenant le p-ième percentile de op
// (rang ceil(p/100 × n)), math.Inf(1) si c'est la tranche de débordement, 0 si op n'a aucune mesure.
func (r *Recorder) Quantile(op string, p float64) float64 {
	// TODO
	panic("à implémenter")
}

// --- Jalon 2 : plusieurs nœuds ---

// Ops renvoie les noms des opérations mesurées, triés.
func (r *Recorder) Ops() []string {
	// TODO
	panic("à implémenter")
}

// Merge ajoute les mesures de other à r (tranche par tranche), y compris les opérations que r ne connaissait pas.
// other n'est pas modifié. Si les bornes diffèrent, renvoie ErrBoundsMismatch sans rien modifier.
func (r *Recorder) Merge(other *Recorder) error {
	// TODO
	panic("à implémenter")
}

// --- Jalon 3 : SLO et budget d'erreur ---

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
	// TODO
	panic("à implémenter")
}
