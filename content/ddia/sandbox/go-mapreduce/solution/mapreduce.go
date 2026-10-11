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
	groups := make(map[string][]V)
	emit := func(key string, value V) { groups[key] = append(groups[key], value) }
	for _, doc := range docs {
		mapFn(doc, emit)
	}
	out := make(map[string]Out, len(groups))
	for key, values := range groups {
		out[key] = reduceFn(key, values)
	}
	return out
}

// Match renvoie, dans l'ordre, les documents qui vérifient pred (étape $match / WHERE).
func Match[T any](docs []T, pred func(T) bool) []T {
	var out []T
	for _, d := range docs {
		if pred(d) {
			out = append(out, d)
		}
	}
	return out
}

// GroupSum regroupe par key(doc) et additionne val(doc) pour chaque groupe (étape $group / GROUP BY … SUM).
func GroupSum[T any](docs []T, key func(T) string, val func(T) int) map[string]int {
	out := make(map[string]int)
	for _, d := range docs {
		out[key(d)] += val(d)
	}
	return out
}

func month(o Observation) string { return o.At.UTC().Format("2006-01") }

// MonthlyTotalsMR renvoie le nombre d'animaux de la famille family observés par mois ("2006-01"),
// calculé avec MapReduce (map émet (mois, nombre), reduce additionne). Dates lues en UTC.
func MonthlyTotalsMR(obs []Observation, family string) map[string]int {
	return MapReduce(
		Match(obs, func(o Observation) bool { return o.Family == family }),
		func(o Observation, emit func(string, int)) { emit(month(o), o.NumAnimals) },
		func(_ string, values []int) int {
			sum := 0
			for _, v := range values {
				sum += v
			}
			return sum
		},
	)
}

// MonthlyTotalsPipeline calcule le même résultat avec les étapes Match puis GroupSum.
func MonthlyTotalsPipeline(obs []Observation, family string) map[string]int {
	return GroupSum(
		Match(obs, func(o Observation) bool { return o.Family == family }),
		month,
		func(o Observation) int { return o.NumAnimals },
	)
}
