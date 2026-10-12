## Hint 1
`Speedup` : applique la formule telle quelle, en convertissant `n` en `float64`.

## Hint 2
`MaxSpeedup` : quand p vaut 1, le dénominateur est nul ; renvoie `math.Inf(1)`.

## Hint 3
`CoresFor` : teste n = 1, 2, 3… jusqu'à ce que `Speedup(p, n) >= target`, après avoir écarté les cas `target <= 1` et `target >= MaxSpeedup(p)`.

## Hint 4
`Chunks` : `size := n / parts`, `extra := n % parts` ; les `extra` premières tranches ont `size+1` éléments.
