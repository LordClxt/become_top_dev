## Hint 1
Le bit `p` est dans le mot `b.bits[p/64]`, au rang `p%64` : `b.bits[p/64] |= 1 << (p % 64)` pour l'allumer.

## Hint 2
`MayContain` parcourt les mêmes `positions` ; dès qu'un bit est éteint, renvoie `false`. Si tous sont allumés, `true`.

## Hint 3
Pour `OptimalK`, `math.Round(float64(m)/float64(n)*math.Ln2)`, converti en `uint` après avoir borné à 1 au minimum.
