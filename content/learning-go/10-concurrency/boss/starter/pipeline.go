package lab

import (
	"context"
	"time"
)

// Source renvoie un channel qui livre les valeurs de nums dans l'ordre puis se ferme.
// Si ctx est annulé, la goroutine s'arrête et le channel est fermé : elle ne reste jamais bloquée sur un envoi.
func Source(ctx context.Context, nums ...int) <-chan int {
	// TODO
	panic("à implémenter")
}

// Stage est une étape de pipeline : elle lit in et produit un channel de sortie qu'elle ferme à la fin.
type Stage func(ctx context.Context, in <-chan int) <-chan int

// FanOut répartit les valeurs de in entre `workers` goroutines (workers <= 0 vaut 1) qui appliquent f chacune,
// et fusionne leurs résultats dans un seul channel (ordre de fin). La sortie est fermée quand tous les workers ont
// terminé. Si ctx est annulé, tout s'arrête et la sortie est fermée, même si personne ne lit plus la sortie.
func FanOut(ctx context.Context, in <-chan int, workers int, f func(int) int) <-chan int {
	// TODO
	panic("à implémenter")
}

// Chain relie les étapes : la sortie de l'une est l'entrée de la suivante, en partant de src.
// Sans étape, Chain renvoie src.
func Chain(ctx context.Context, src <-chan int, stages ...Stage) <-chan int {
	// TODO
	panic("à implémenter")
}

// First lance toutes les fonctions en parallèle et renvoie le premier SUCCÈS (erreur nil).
// Dès qu'un succès arrive, le contexte des autres est annulé. Si toutes échouent, renvoie leurs erreurs
// réunies (errors.Join). First attend la fin de toutes les goroutines avant de rendre la main. Sans fonction : erreur non nil.
func First[T any](ctx context.Context, fs ...func(context.Context) (T, error)) (T, error) {
	// TODO
	panic("à implémenter")
}

// Run assemble le tout : Source(nums) → FanOut(workers, f) et renvoie les résultats TRIÉS par ordre croissant.
// Le traitement entier est limité par `limit` : au-delà, Run renvoie ce qu'il n'a pas pu obtenir sous la forme
// (nil, erreur du contexte), l'erreur étant context.DeadlineExceeded (testable avec errors.Is).
// Aucune goroutine ne doit rester en vie au retour.
func Run(ctx context.Context, nums []int, workers int, f func(int) int, limit time.Duration) ([]int, error) {
	// TODO
	panic("à implémenter")
}
