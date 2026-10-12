## Hint 1
`RunAll` : crée un channel `done`, lance chaque fonction dans une goroutine qui y envoie un signal en fin (avec `defer`), puis reçois autant de signaux que de fonctions.

## Hint 2
`SquareAll` : alloue `out := make([]int, len(nums))` ; chaque goroutine écrit `out[i]` pour **son** indice, donc aucune écriture n'est partagée. Réutilise `RunAll`.

## Hint 3
`SumOfSquares` : découpe en `workers` tranches (les `len%workers` premières ont un élément de plus), une case de sous-total par goroutine, puis additionne après `RunAll`.
