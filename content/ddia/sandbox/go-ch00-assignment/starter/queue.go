package lab

// OpenLoop simule un serveur unique qui traite les requêtes dans l'ordre d'arrivée (FIFO).
// arrivals[i] est l'instant d'arrivée de la requête i (croissant), service[i] sa durée de traitement.
// Elle renvoie le temps de réponse de chaque requête : instant de fin − instant d'arrivée.
// Si les deux slices n'ont pas la même longueur, renvoie nil.
func OpenLoop(arrivals, service []float64) []float64 {
	// TODO
	panic("à implémenter")
}

// ClosedLoop simule un client qui attend la réponse avant d'envoyer la requête suivante, sur un serveur
// vide : aucune requête n'attend jamais dans une file. Renvoie une copie de service.
func ClosedLoop(service []float64) []float64 {
	// TODO
	panic("à implémenter")
}

// Summary résume une distribution de temps de réponse.
type Summary struct {
	Mean, P50, P95, P99, Max float64
}

// Summarize calcule la moyenne, les percentiles (rang le plus proche : ceil(p/100 × n)) et le maximum.
// Sans mesure, renvoie le Summary nul. responses n'est pas modifié.
func Summarize(responses []float64) Summary {
	// TODO
	panic("à implémenter")
}

// SLO est un objectif de niveau de service : seuils maximaux autorisés pour la médiane et le p99.
type SLO struct {
	P50, P99 float64
}

// Violations renvoie, dans l'ordre "p50" puis "p99", les objectifs que s dépasse strictement.
// Si tout est respecté, renvoie une slice vide (non nil).
func Violations(s Summary, slo SLO) []string {
	// TODO
	panic("à implémenter")
}
