package lab

import "time"

// Observation est un enregistrement du carnet d'un biologiste marin.
type Observation struct {
	At         time.Time
	Family     string
	Species    string
	NumAnimals int
}

// MapReduce applique mapFn une fois à chaque document, regroupe les valeurs émises par clé (dans l'ordre
// d'émission) puis appelle reduceFn une fois par clé. mapFn et reduceFn doivent être pures.
func MapReduce[In, V, Out any](
	docs []In,
	mapFn func(doc In, emit func(key string, value V)),
	reduceFn func(key string, values []V) Out,
) map[string]Out {
	// TODO
	panic("à implémenter")
}

// Match renvoie, dans l'ordre, les documents qui vérifient pred (étape $match / WHERE).
func Match[T any](docs []T, pred func(T) bool) []T {
	// TODO
	panic("à implémenter")
}

// GroupSum regroupe par key(doc) et additionne val(doc) pour chaque groupe (étape $group / GROUP BY … SUM).
func GroupSum[T any](docs []T, key func(T) string, val func(T) int) map[string]int {
	// TODO
	panic("à implémenter")
}

// MonthlyTotalsMR renvoie le nombre d'animaux de la famille family observés par mois ("2006-01"),
// calculé avec MapReduce (map émet (mois, nombre), reduce additionne). Dates lues en UTC.
func MonthlyTotalsMR(obs []Observation, family string) map[string]int {
	// TODO
	panic("à implémenter")
}

// MonthlyTotalsPipeline calcule le même résultat avec les étapes Match puis GroupSum.
func MonthlyTotalsPipeline(obs []Observation, family string) map[string]int {
	// TODO
	panic("à implémenter")
}
