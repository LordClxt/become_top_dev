package lab

import (
	"math"
	"slices"
)

// OpenLoop simule un serveur unique qui traite les requêtes dans l'ordre d'arrivée (FIFO).
// arrivals[i] est l'instant d'arrivée de la requête i (croissant), service[i] sa durée de traitement.
// Elle renvoie le temps de réponse de chaque requête : instant de fin − instant d'arrivée.
// Si les deux slices n'ont pas la même longueur, renvoie nil.
func OpenLoop(arrivals, service []float64) []float64 {
	if len(arrivals) != len(service) {
		return nil
	}
	responses := make([]float64, len(arrivals))
	free := 0.0 // instant où le serveur redevient libre
	for i, arrival := range arrivals {
		start := math.Max(arrival, free)
		free = start + service[i]
		responses[i] = free - arrival
	}
	return responses
}

// ClosedLoop simule un client qui attend la réponse avant d'envoyer la requête suivante, sur un serveur
// vide : aucune requête n'attend jamais dans une file.
func ClosedLoop(service []float64) []float64 {
	return slices.Clone(service)
}

// Summary résume une distribution de temps de réponse.
type Summary struct {
	Mean, P50, P95, P99, Max float64
}

// Summarize calcule la moyenne, les percentiles (rang le plus proche : ceil(p/100 × n)) et le maximum.
// Sans mesure, renvoie le Summary nul. responses n'est pas modifié.
func Summarize(responses []float64) Summary {
	if len(responses) == 0 {
		return Summary{}
	}
	sorted := slices.Clone(responses)
	slices.Sort(sorted)
	sum := 0.0
	for _, r := range sorted {
		sum += r
	}
	at := func(p float64) float64 {
		rank := int(math.Ceil(p / 100 * float64(len(sorted))))
		return sorted[min(max(rank, 1), len(sorted))-1]
	}
	return Summary{
		Mean: sum / float64(len(sorted)),
		P50:  at(50),
		P95:  at(95),
		P99:  at(99),
		Max:  sorted[len(sorted)-1],
	}
}

// SLO est un objectif de niveau de service : seuils maximaux autorisés pour la médiane et le p99.
type SLO struct {
	P50, P99 float64
}

// Violations renvoie, dans l'ordre "p50" puis "p99", les objectifs que s dépasse strictement.
// Si tout est respecté, renvoie une slice vide (non nil).
func Violations(s Summary, slo SLO) []string {
	out := []string{}
	if s.P50 > slo.P50 {
		out = append(out, "p50")
	}
	if s.P99 > slo.P99 {
		out = append(out, "p99")
	}
	return out
}
