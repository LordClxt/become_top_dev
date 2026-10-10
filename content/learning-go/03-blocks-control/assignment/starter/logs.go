package lab

// Report résume un journal.
type Report struct {
	Lines        int            // lignes prises en compte : valides ou mal formées, hors lignes vides et commentaires
	Counts       map[string]int // nombre de lignes par niveau canonique : DEBUG, INFO, WARN, ERROR
	ErrorSources []string       // sources distinctes ayant au moins une ligne ERROR, triées
	Malformed    int            // lignes ignorées car illisibles
	Truncated    bool           // vrai si le journal s'est arrêté sur --END--
}

// Analyze lit un journal dont chaque ligne a la forme « NIVEAU SOURCE message… ».
// Voir instructions.md pour les règles.
func Analyze(log string) Report {
	// TODO
	panic("à implémenter")
}
