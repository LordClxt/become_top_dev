package lab

// WordCount associe un mot à son nombre d'occurrences.
type WordCount struct {
	Word  string
	Count int
}

// Report résume un texte.
type Report struct {
	Words       int
	UniqueWords int
	Top         []WordCount
	Longest     string
}

// Analyze construit le rapport d'un texte. Voir instructions.md pour les règles.
func Analyze(text string, top int) Report {
	// TODO
	return Report{}
}
