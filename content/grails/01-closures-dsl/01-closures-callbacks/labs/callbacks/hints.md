## Hint 1
Pour `collectAdaptive`, la closure sait combien de paramètres elle accepte : `c.maximumNumberOfParameters` (ou `c.getMaximumNumberOfParameters()`). Compare à 1 pour choisir entre `c(entry)` et `c(entry.key, entry.value)`. Décide une fois avant la boucle.

## Hint 2
Pour `withResource`, c'est un `try { … } finally { … }` classique. Mets le `return c(log)` dans le `try` : le `finally` s'exécute quand même, et l'exception éventuelle repart toute seule.

## Hint 3
Pour `firstOver`, n'utilise pas `items.each { … return … }` : le `return` ne quitterait que la closure et la boucle continuerait. Prends un `for (item in items) { … }` avec un `return` dedans, ou la méthode `find`.
