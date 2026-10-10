package lab

// Codes renvoyés par Lint.
const (
	Invalid       = "invalid"
	NonASCII      = "non-ascii"
	SnakeCase     = "snake-case"
	ScreamingCase = "screaming-case"
)

// IsValidIdentifier indique si name est un identifiant légal pour le compilateur Go.
func IsValidIdentifier(name string) bool {
	// TODO
	panic("à implémenter")
}

// Lint renvoie les écarts de style d'un nom. Un nom invalide ne renvoie que [Invalid].
// L'identifiant blanc « _ » est toujours correct.
func Lint(name string) []string {
	// TODO
	panic("à implémenter")
}
