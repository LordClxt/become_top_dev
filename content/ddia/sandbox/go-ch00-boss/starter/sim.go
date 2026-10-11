package lab

// Run simule un serveur à plusieurs workers : les requêtes arrivent aux instants arrivals (croissants), dans cet ordre,
// et chacune est prise par le worker libre le plus tôt (à égalité, le plus petit indice). Elle démarre à
// max(arrivée, libération du worker). Renvoie le temps de réponse de chaque requête (fin − arrivée), dans l'ordre d'entrée.
// Renvoie nil si workers < 1 ou si les longueurs diffèrent.
func Run(arrivals, service []float64, workers int) []float64 {
	// TODO
	panic("à implémenter")
}

// FanOut calcule le temps de réponse de chaque requête utilisateur : calls[i] contient les temps de réponse des appels
// backend faits (en parallèle) pour la requête i ; elle attend le plus lent. Sans appel, 0.
func FanOut(calls [][]float64) []float64 {
	// TODO
	panic("à implémenter")
}

// Percentile renvoie le p-ième percentile (rang le plus proche : ceil(p/100 × n)) sans modifier responses. Vide : 0.
func Percentile(responses []float64, p float64) float64 {
	// TODO
	panic("à implémenter")
}

// SlowShare renvoie la part (entre 0 et 1) des réponses strictement supérieures à threshold. Vide : 0.
func SlowShare(responses []float64, threshold float64) float64 {
	// TODO
	panic("à implémenter")
}

// MinWorkers renvoie le plus petit nombre de workers (entre 1 et maxWorkers) pour lequel le p99 de Run est ≤ target.
// Si aucun ne convient, renvoie 0 et false.
func MinWorkers(arrivals, service []float64, target float64, maxWorkers int) (int, bool) {
	// TODO
	panic("à implémenter")
}
