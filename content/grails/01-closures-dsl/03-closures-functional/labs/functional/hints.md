## Hint 1
`compose` : parcours les closures avec `inject`, en partant de l'identité `{ x -> x }`, et enchaîne avec `>>` : `acc >> f`.

## Hint 2
`partial` et `withLast` sont des cas particuliers de `curry` et de `rcurry`. Pour `partial`, passe le tableau en le « dépliant » : `c.curry(fixed)` accepte un tableau.

## Hint 3
Pour `sumTo`, déclare d'abord `Closure sum` (pour pouvoir se référencer), puis `sum = { long k, long acc = 0 -> … sum.trampoline(k - 1, acc + k) }`, puis `sum = sum.trampoline()` avant de l'appeler. L'appel récursif doit être la dernière chose que fait la closure.
