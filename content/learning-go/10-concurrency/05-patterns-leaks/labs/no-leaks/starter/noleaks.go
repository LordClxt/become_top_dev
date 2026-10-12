package lab

import (
	"context"
	"errors"
	"time"
)

// ErrTimeout est renvoyée par TimeLimit quand le travail dépasse son délai.
var ErrTimeout = errors.New("délai dépassé")

// ErrBusy est renvoyée par PressureGauge.Do quand la limite de requêtes simultanées est atteinte.
var ErrBusy = errors.New("trop de requêtes")

// CountTo renvoie un channel qui livre 1, 2, …, max puis se ferme. Si ctx est annulé avant la fin,
// la goroutine productrice s'arrête (elle ne reste JAMAIS bloquée sur un envoi) et le channel est fermé.
func CountTo(ctx context.Context, max int) <-chan int {
	// TODO
	panic("à implémenter")
}

// TimeLimit exécute work dans une goroutine et renvoie son résultat, ou (zéro, ErrTimeout) si limit est dépassé.
// La goroutine de travail doit pouvoir se terminer même si personne n'attend plus son résultat.
func TimeLimit[T any](work func() T, limit time.Duration) (T, error) {
	// TODO
	panic("à implémenter")
}

// PressureGauge limite le nombre d'appels simultanés à Do.
type PressureGauge struct {
	// TODO : un channel tamponné comme jeu de jetons
}

// NewPressureGauge crée un limiteur qui accepte au plus limit appels simultanés.
func NewPressureGauge(limit int) *PressureGauge {
	// TODO
	panic("à implémenter")
}

// Do exécute f si un jeton est libre, et le rend à la fin (même si f panique). S'il n'y en a plus, Do ne bloque PAS :
// il renvoie tout de suite ErrBusy sans exécuter f.
func (p *PressureGauge) Do(f func()) error {
	// TODO
	panic("à implémenter")
}
