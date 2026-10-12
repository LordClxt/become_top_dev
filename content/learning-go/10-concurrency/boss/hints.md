## Hint 1
Chaque envoi sur un channel doit être gardé par `<-ctx.Done()` dans un `select`. C'est le seul moyen de garantir qu'aucune goroutine ne reste bloquée après l'annulation.

## Hint 2
`FanOut` : un `WaitGroup`, `workers` goroutines qui lisent `in`, et un moniteur qui fait `wg.Wait()` puis `close(out)`. La lecture de `in` ET l'envoi sur `out` sont gardés par `ctx.Done()`.

## Hint 3
`First` : un channel de résultats de capacité `len(fs)` (personne ne bloque en écrivant). Au premier succès, `cancel()`. Termine par `wg.Wait()` pour ne laisser aucune goroutine ; si aucun succès, `errors.Join(errs...)`.

## Hint 4
`Run` : `context.WithTimeout`, `FanOut(Source(...))`, lis toute la sortie avec `range`. Après la boucle, si `ctx.Err() != nil`, renvoie `nil, ctx.Err()` ; sinon trie avec `sort.Ints`.
