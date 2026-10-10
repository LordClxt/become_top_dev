package relay

// Job est une tâche que Relay doit exécuter.
type Job struct {
	ID       string
	Kind     string
	Priority int
	Tags     []string
}

// Index associe chaque ID à son job (le premier en cas de doublon)
// et renvoie la liste des IDs en double.
func Index(jobs []Job) (byID map[string]Job, duplicates []string) {
	// TODO: étape 1
	return nil, nil
}

// ByKind regroupe les jobs par type, dans l'ordre d'arrivée.
func ByKind(jobs []Job) map[string][]Job {
	// TODO: étape 2
	return nil
}

// NextBatch extrait les n jobs les plus prioritaires.
// batch et rest ne partagent jamais de mémoire.
func NextBatch(queue []Job, n int) (batch, rest []Job) {
	// TODO: étape 3
	return nil, nil
}
