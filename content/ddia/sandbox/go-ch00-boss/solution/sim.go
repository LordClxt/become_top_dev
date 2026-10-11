package lab

import (
	"math"
	"slices"
)

// Run simule un serveur à plusieurs workers : les requêtes arrivent aux instants arrivals (croissants), dans cet ordre,
// et chacune est prise par le worker libre le plus tôt (à égalité, le plus petit indice). Elle démarre à
// max(arrivée, libération du worker). Renvoie le temps de réponse de chaque requête (fin − arrivée), dans l'ordre d'entrée.
// Renvoie nil si workers < 1 ou si les longueurs diffèrent.
func Run(arrivals, service []float64, workers int) []float64 {
	if workers < 1 || len(arrivals) != len(service) {
		return nil
	}
	free := make([]float64, workers)
	responses := make([]float64, len(arrivals))
	for i, arrival := range arrivals {
		w := 0
		for j := range free {
			if free[j] < free[w] {
				w = j
			}
		}
		start := math.Max(arrival, free[w])
		free[w] = start + service[i]
		responses[i] = free[w] - arrival
	}
	return responses
}

// FanOut calcule le temps de réponse de chaque requête utilisateur : calls[i] contient les temps de réponse des appels
// backend faits (en parallèle) pour la requête i ; elle attend le plus lent. Sans appel, 0.
func FanOut(calls [][]float64) []float64 {
	out := make([]float64, len(calls))
	for i, c := range calls {
		for _, v := range c {
			out[i] = max(out[i], v)
		}
	}
	return out
}

// Percentile renvoie le p-ième percentile (rang le plus proche : ceil(p/100 × n)) sans modifier responses. Vide : 0.
func Percentile(responses []float64, p float64) float64 {
	if len(responses) == 0 {
		return 0
	}
	sorted := slices.Clone(responses)
	slices.Sort(sorted)
	rank := min(max(int(math.Ceil(p/100*float64(len(sorted)))), 1), len(sorted))
	return sorted[rank-1]
}

// SlowShare renvoie la part (entre 0 et 1) des réponses strictement supérieures à threshold. Vide : 0.
func SlowShare(responses []float64, threshold float64) float64 {
	if len(responses) == 0 {
		return 0
	}
	slow := 0
	for _, r := range responses {
		if r > threshold {
			slow++
		}
	}
	return float64(slow) / float64(len(responses))
}

// MinWorkers renvoie le plus petit nombre de workers (entre 1 et maxWorkers) pour lequel le p99 de Run est ≤ target.
// Si aucun ne convient, renvoie 0 et false.
func MinWorkers(arrivals, service []float64, target float64, maxWorkers int) (int, bool) {
	for w := 1; w <= maxWorkers; w++ {
		if Percentile(Run(arrivals, service, w), 99) <= target {
			return w, true
		}
	}
	return 0, false
}
