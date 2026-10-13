## Contexte

Lancer une goroutine est facile ; savoir **quand elle a fini** et **récupérer son résultat sans course de données** l'est moins. Tu écris les trois gestes de base : lancer, attendre, regrouper.

## Ta mission

Dans `goroutines.go`, implémente :

### `RunAll(fns ...func())`

Lance chaque fonction dans **sa propre goroutine**, puis ne rend la main qu'après la fin de **toutes**. Les fonctions doivent vraiment tourner en même temps : un test en fait attendre une sur une autre, ce qui bloquerait si tu les appelais l'une après l'autre. Sans argument, `RunAll` rend la main tout de suite.

### `SquareAll(nums []int) []int`

Renvoie le carré de chaque entier, **dans le même ordre**, en calculant chaque carré dans sa propre goroutine.

```go
SquareAll([]int{1, 2, 3})   // [1 4 9]
```

Astuce de conception : chaque goroutine écrit dans **sa propre case** d'une slice allouée d'avance. Deux goroutines qui écrivent dans deux cases différentes ne se marchent pas dessus.

### `SumOfSquares(nums []int, workers int) int`

Renvoie la somme des carrés en répartissant le travail entre `workers` goroutines, chacune sur une **tranche contiguë** de `nums`.
- `workers <= 0` compte comme 1 ; `workers > len(nums)` est ramené à `len(nums)`.
- Une slice vide donne `0`.
- Chaque goroutine écrit son sous-total dans sa propre case ; l'appelant additionne à la fin.

```go
SumOfSquares([]int{1, 2, 3, 4}, 2)   // 30
```

## Contraintes

- Les tests tournent avec le **détecteur de courses** (`-race`) : une variable partagée modifiée sans synchronisation fait échouer le test, même si le résultat semble juste.
- Utilise `sync.WaitGroup` pour attendre la fin des goroutines.
