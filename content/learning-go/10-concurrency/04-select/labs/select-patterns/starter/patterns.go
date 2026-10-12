package lab

import (
	"errors"
	"time"
)

// ErrTimeout est renvoyée par WithTimeout quand rien n'arrive à temps.
var ErrTimeout = errors.New("délai dépassé")

// TryReceive tente de lire une valeur SANS bloquer : (v, true) si une valeur est prête, (0, false) sinon.
func TryReceive(ch <-chan int) (int, bool) {
	// TODO
	panic("à implémenter")
}

// FirstOf renvoie la première valeur reçue sur a ou sur b (celle qui arrive en premier).
func FirstOf(a, b <-chan int) int {
	// TODO
	panic("à implémenter")
}

// WithTimeout attend une valeur sur ch pendant au plus d. Au-delà : (0, ErrTimeout).
// Si ch est fermé avant, il renvoie la valeur zéro et une erreur nil.
func WithTimeout(ch <-chan int, d time.Duration) (int, error) {
	// TODO
	panic("à implémenter")
}

// Join lit a et b en même temps jusqu'à ce que LES DEUX soient fermés et renvoie toutes les valeurs reçues
// (dans l'ordre d'arrivée). Une fois un channel fermé, il ne doit plus jamais être relu : mets-le à nil.
// Si a et b sont déjà fermés, renvoie une slice vide non nil.
func Join(a, b <-chan int) []int {
	// TODO
	panic("à implémenter")
}
