// Package lab contient un mini go vet pour les chaînes de format de fmt.
package lab

import "strings"

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

const (
	flags = "+-# 0"
	verbs = "vTtbcdoOqxXUeEfFgGsp"
)

// CheckFormat analyse format comme le ferait fmt.Printf avec nargs valeurs.
// Chaque verbe consomme une valeur, ainsi que chaque * de largeur ou de précision.
func CheckFormat(format string, nargs int) Report {
	var r Report
	used := 0
	for i := 0; i < len(format); i++ {
		if format[i] != '%' {
			continue
		}
		start := i
		i++
		if i < len(format) && format[i] == '%' {
			continue // %% : un % littéral
		}
		for i < len(format) && strings.IndexByte(flags, format[i]) >= 0 {
			i++
		}
		i, used = skipNumber(format, i, used)
		if i < len(format) && format[i] == '.' {
			i, used = skipNumber(format, i+1, used)
		}
		if i >= len(format) {
			r.Trailing = true
			break
		}
		verb := format[start : i+1]
		if strings.IndexByte(verbs, format[i]) < 0 {
			r.Unknown = append(r.Unknown, verb)
		} else {
			r.Verbs = append(r.Verbs, verb)
		}
		used++
	}
	r.Missing = max(0, used-nargs)
	r.Extra = max(0, nargs-used)
	return r
}

// skipNumber avance après une largeur ou une précision : des chiffres, ou * qui lit une valeur.
func skipNumber(format string, i, used int) (int, int) {
	if i < len(format) && format[i] == '*' {
		return i + 1, used + 1
	}
	for i < len(format) && format[i] >= '0' && format[i] <= '9' {
		i++
	}
	return i, used
}
