package lab

import (
	"slices"
	"strings"
	"unicode"
)

// Codes renvoyés par Lint.
const (
	Invalid       = "invalid"
	NonASCII      = "non-ascii"
	SnakeCase     = "snake-case"
	ScreamingCase = "screaming-case"
)

var keywords = map[string]bool{}

func init() {
	for _, k := range strings.Fields(`break default func interface select case defer go map struct chan else
		goto package switch const fallthrough if range type continue for import return var`) {
		keywords[k] = true
	}
}

// IsValidIdentifier indique si name est un identifiant légal pour le compilateur Go.
func IsValidIdentifier(name string) bool {
	if name == "" || keywords[name] {
		return false
	}
	for i, r := range name {
		switch {
		case r == '_' || unicode.IsLetter(r):
		case i > 0 && unicode.IsDigit(r):
		default:
			return false
		}
	}
	return true
}

// Lint renvoie les écarts de style d'un nom. Un nom invalide ne renvoie que [Invalid].
// L'identifiant blanc « _ » est toujours correct.
func Lint(name string) []string {
	if !IsValidIdentifier(name) {
		return []string{Invalid}
	}
	if name == "_" {
		return nil
	}

	var problems []string
	if slices.ContainsFunc([]rune(name), func(r rune) bool { return r > unicode.MaxASCII }) {
		problems = append(problems, NonASCII)
	}
	if strings.Contains(name, "_") {
		if strings.ToUpper(name) == name {
			problems = append(problems, ScreamingCase)
		} else {
			problems = append(problems, SnakeCase)
		}
	}
	return problems
}
