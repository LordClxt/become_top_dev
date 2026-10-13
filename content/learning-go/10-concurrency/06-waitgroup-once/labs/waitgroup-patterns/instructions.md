## Contexte

`sync.WaitGroup` attend un groupe de goroutines ; `sync.Once` exécute une initialisation une seule fois. Tu les combines dans quatre motifs qu'on retrouve partout : fusion de flux, pool de workers, collecte d'erreurs et initialisation paresseuse.

## Ta mission

Dans `patterns.go`, implémente :

### `Merge(chs ...<-chan int) <-chan int`

Fusionne plusieurs channels en un seul : chaque valeur lue sur une entrée est livrée sur la sortie, dans l'ordre d'arrivée (aucun ordre garanti entre les entrées). La sortie se ferme quand **toutes** les entrées sont épuisées ; sans argument, elle se ferme tout de suite.

Motif attendu : une goroutine par entrée, un `WaitGroup` qui les compte, et une goroutine **moniteur** qui fait `wg.Wait()` puis ferme la sortie.

### `ProcessAll(in []int, workers int, f func(int) int) []int`

Applique `f` à chaque élément avec **au plus** `workers` goroutines en même temps, et renvoie les résultats **dans l'ordre de `in`**. `workers <= 0` compte comme 1.

```go
ProcessAll([]int{1, 2, 3}, 2, func(v int) int { return v * v })   // [1 4 9]
```

### `RunAllErr(fns ...func() error) error`

Lance toutes les fonctions en parallèle, attend qu'elles aient **toutes** fini, puis renvoie l'erreur de la **première fonction dans l'ordre des arguments** qui a échoué (pas la première à échouer dans le temps), ou `nil`.

### `Lazy[T any](build func() T) func() T`

Renvoie une fonction qui appelle `build` au premier appel, puis renvoie toujours la même valeur. Même avec beaucoup de goroutines qui l'appellent en même temps, `build` ne s'exécute qu'**une fois**. Utilise `sync.Once`.

## Contraintes

- Aucune goroutine ne doit rester en vie après coup.
- Les tests tournent avec le détecteur de courses (`-race`).
