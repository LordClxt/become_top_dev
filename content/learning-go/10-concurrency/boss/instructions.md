## Énoncé

Tu assembles un vrai pipeline de traitement à partir de cinq pièces. Le fil rouge : **aucune goroutine ne doit survivre à une annulation**, même si personne ne lit plus les résultats.

Dans `pipeline.go`, implémente :

### `Source(ctx, nums ...int) <-chan int`

Livre les valeurs de `nums` dans l'ordre puis ferme le channel. Si `ctx` est annulé, la goroutine s'arrête et ferme le channel : elle ne reste jamais bloquée sur un envoi.

### `FanOut(ctx, in, workers, f) <-chan int`

Répartit les valeurs de `in` entre `workers` goroutines (`workers <= 0` vaut 1) qui appliquent `f`, et fusionne leurs résultats dans un seul channel, dans l'ordre de fin. La sortie se ferme quand tous les workers ont terminé, ou quand `ctx` est annulé, même si personne ne lit plus.

### `Chain(ctx, src, stages ...Stage) <-chan int`

Relie les étapes : la sortie de l'une est l'entrée de la suivante, en partant de `src`. Sans étape, renvoie `src`. Le type `Stage` est déjà déclaré : `func(ctx context.Context, in <-chan int) <-chan int`.

### `First[T any](ctx, fs ...func(context.Context) (T, error)) (T, error)`

Lance toutes les fonctions en parallèle et renvoie le **premier succès**. Dès qu'il arrive, annule le contexte des autres. Si toutes échouent, renvoie leurs erreurs réunies avec `errors.Join`. Sans fonction : une erreur non nil. `First` attend la fin de toutes les goroutines avant de rendre la main.

### `Run(ctx, nums, workers, f, limit) ([]int, error)`

Assemble `Source(nums)` puis `FanOut(workers, f)`, et renvoie les résultats **triés** par ordre croissant. Tout le traitement est limité par `limit` : au-delà, renvoie `(nil, err)` avec `errors.Is(err, context.DeadlineExceeded)`.

```go
Run(ctx, []int{3, 1, 2}, 2, func(v int) int { return v * 10 }, time.Second)   // [10 20 30], nil
```

## Règles

- Les tests tournent avec le détecteur de courses (`-race`) et comptent les goroutines encore en vie après chaque appel.
- Chaque envoi sur un channel se fait dans un `select` qui écoute aussi `ctx.Done()`.
