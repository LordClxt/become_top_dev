## Hint 1
Pour `accumulator`, déclare une variable locale dans la méthode (`def total = start`) puis renvoie une closure qui la modifie. Une closure garde une *référence* à `total` : elle la change d'appel en appel.

## Hint 2
Pour `counters`, même idée : une seule variable locale `int count = 0`, et deux closures dans la map qui la capturent. Écris `{ -> … }` pour des closures sans paramètre.

## Hint 3
Pour `runWith`, deux propriétés de `Closure` à affecter : `c.delegate = …` et `c.resolveStrategy = Closure.DELEGATE_FIRST`. Appelle ensuite `c()` et renvoie son résultat.
