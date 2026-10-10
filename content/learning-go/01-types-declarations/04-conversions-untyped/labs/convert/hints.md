## Hint 1
`Average` et `Percent` : la division de deux `int` donne un `int`. Convertis les deux opérandes en `float64` **avant** de diviser.

## Hint 2
`ClampToByte` et `NarrowToInt32` : compare `n` aux bornes (`math.MaxUint8`, `math.MinInt32`, `math.MaxInt32`…) avant la conversion, pas après. Une fois converti, le débordement est déjà fait et invisible.

## Hint 3
`RoundToInt` : le paquet `math` a une fonction qui arrondit au plus proche en s'éloignant de zéro pour les demi-valeurs. Convertis ensuite son résultat en `int`. Pour les cas vides (`Average`) et nuls (`Percent`), un `if` en tête de fonction suffit.
