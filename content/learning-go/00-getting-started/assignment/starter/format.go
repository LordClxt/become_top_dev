// Package lab contient un mini go vet pour les chaînes de format de fmt.
package lab

// Report décrit ce que CheckFormat a trouvé dans une chaîne de format.
type Report struct {
	Verbs    []string // verbes complets, dans l'ordre : "%d", "%-5s", "%.2f"
	Unknown  []string // verbes que fmt ne connaît pas : "%z"
	Missing  int      // valeurs attendues mais absentes
	Extra    int      // valeurs passées mais jamais lues
	Trailing bool     // un % seul en fin de format
}

// OK indique que le format et les valeurs concordent.
func (r Report) OK() bool {
	return len(r.Unknown) == 0 && r.Missing == 0 && r.Extra == 0 && !r.Trailing
}

// CheckFormat analyse format comme le ferait fmt.Printf avec nargs valeurs.
// Chaque verbe consomme une valeur, ainsi que chaque * de largeur ou de précision.
func CheckFormat(format string, nargs int) Report {
	// TODO: parcourir format et remplir le rapport.
	return Report{}
}
