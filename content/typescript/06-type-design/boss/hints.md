## Hint 1
Comme `CaseCall`, `MatchCall` est une interface : `0: 'match'; [n: number]: StyleExpression; length: 5 | 7 | 9 | 11`.

## Hint 2
Dans `evaluate`, écarte d'abord les primitives, puis `switch (expr[0])`. Pour `case` et `match`, affecte `expr` à une variable annotée (`const call: MatchCall = expr`) et parcours les paires avec un indice.

## Hint 3
`propertiesUsed` : une fonction récursive qui parcourt tous les éléments d'un appel (`for (let i = 1; i < expr.length; i++)`), et un `Set` pour l'unicité.
