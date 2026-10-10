package relay

import (
	"cmp"
	"slices"
)

// Job est une tâche que Relay doit exécuter.
type Job struct {
	ID       string
	Kind     string
	Priority int
	Tags     []string
}

// Index associe chaque ID à son job (le premier en cas de doublon)
// et renvoie la liste des IDs en double.
func Index(jobs []Job) (map[string]Job, []string) {
	byID := make(map[string]Job, len(jobs))
	duplicates := []string{}
	reported := map[string]bool{}
	for _, j := range jobs {
		if _, ok := byID[j.ID]; !ok {
			byID[j.ID] = j
			continue
		}
		if !reported[j.ID] {
			duplicates = append(duplicates, j.ID)
			reported[j.ID] = true
		}
	}
	return byID, duplicates
}

// ByKind regroupe les jobs par type, dans l'ordre d'arrivée.
func ByKind(jobs []Job) map[string][]Job {
	out := map[string][]Job{}
	for _, j := range jobs {
		out[j.Kind] = append(out[j.Kind], j)
	}
	return out
}

// NextBatch extrait les n jobs les plus prioritaires.
// batch et rest ne partagent jamais de mémoire.
func NextBatch(queue []Job, n int) ([]Job, []Job) {
	n = min(max(n, 0), len(queue))

	order := make([]int, len(queue))
	for i := range order {
		order[i] = i
	}
	slices.SortStableFunc(order, func(a, b int) int {
		return cmp.Compare(queue[b].Priority, queue[a].Priority)
	})

	chosen := make([]bool, len(queue))
	batch := make([]Job, 0, n)
	for _, i := range order[:n] {
		chosen[i] = true
		batch = append(batch, queue[i])
	}

	rest := make([]Job, 0, len(queue)-n)
	for i, j := range queue {
		if !chosen[i] {
			rest = append(rest, j)
		}
	}
	return batch, rest
}
