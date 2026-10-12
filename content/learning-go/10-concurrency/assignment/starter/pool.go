package lab

import "context"

// Result est le résultat du traitement d'une entrée.
type Result struct {
	In  int
	Out int
	Err error
}

// ProcessAll lit les entiers de in et applique f à chacun avec au plus `workers` goroutines simultanées
// (workers <= 0 est traité comme 1). Chaque entrée produit exactement un Result sur le channel renvoyé
// (dans l'ordre de fin, pas d'entrée), sauf si ctx est annulé avant.
//
// Exigences :
//   - le channel de sortie est fermé UNE fois, quand tous les workers ont terminé ;
//   - quand ctx est annulé, les workers cessent de prendre de nouvelles entrées, et l'envoi d'un résultat ne
//     bloque jamais : même si l'appelant a cessé de lire, aucune goroutine ne reste bloquée ;
//   - une erreur renvoyée par f est rapportée dans Result.Err, elle n'arrête pas les autres entrées.
func ProcessAll(ctx context.Context, in <-chan int, workers int, f func(context.Context, int) (int, error)) <-chan Result {
	// TODO
	panic("à implémenter")
}
