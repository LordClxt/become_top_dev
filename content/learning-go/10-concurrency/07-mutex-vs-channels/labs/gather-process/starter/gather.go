package lab

import (
	"context"
	"time"
)

// Gather lance fa et fb en parallèle, chacune avec un contexte dérivé de ctx, attend les DEUX, et renvoie leurs résultats.
// Si l'une échoue, Gather annule le contexte de l'autre (pour qu'elle s'arrête vite) et renvoie la PREMIÈRE erreur survenue.
// Gather ne rend la main qu'après la fin des deux goroutines : aucune ne doit rester en vie.
func Gather(ctx context.Context, fa, fb func(context.Context) (int, error)) (a, b int, err error) {
	// TODO
	panic("à implémenter")
}

// GatherAndProcess applique un délai global `limit` à tout le traitement, puis :
//  1. appelle Gather(ctx, fa, fb) ;
//  2. si tout va bien, appelle fc(ctx, a, b) et renvoie son résultat.
// Si le délai expire (ou si ctx est annulé) avant la fin, renvoie l'erreur du contexte (context.DeadlineExceeded
// ou context.Canceled, testable avec errors.Is). Aucune goroutine ne doit fuir.
func GatherAndProcess(ctx context.Context, limit time.Duration, fa, fb func(context.Context) (int, error), fc func(context.Context, int, int) (int, error)) (int, error) {
	// TODO
	panic("à implémenter")
}
