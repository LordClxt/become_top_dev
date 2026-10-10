package lab

import "errors"

var (
	ErrFormat   = errors.New("format invalide")
	ErrUnit     = errors.New("unité inconnue")
	ErrFraction = errors.New("la taille n'est pas un nombre entier d'octets")
	ErrTooLarge = errors.New("taille trop grande")
)

// ParseSize lit une taille comme « 512 », « 10KB » ou « 1.5MiB » et renvoie un nombre d'octets.
func ParseSize(s string) (int64, error) {
	// TODO (jalon 1)
	panic("à implémenter")
}

// FormatSize affiche n octets avec l'unité binaire la plus grande possible et une décimale tronquée.
func FormatSize(n int64) string {
	// TODO (jalon 2)
	panic("à implémenter")
}

// Percent renvoie la part de used dans limit, en pourcentage (0 si limit n'est pas strictement positif).
func Percent(used, limit int64) float64 {
	// TODO (jalon 3)
	panic("à implémenter")
}

// Level classe l'usage : « unlimited » (limit <= 0), « ok » (< 80 %), « warn » (de 80 % à moins de 100 %), « full ».
func Level(used, limit int64) string {
	// TODO (jalon 3)
	panic("à implémenter")
}
