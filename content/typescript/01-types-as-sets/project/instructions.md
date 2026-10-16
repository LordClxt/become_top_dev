## Contexte

Jalon 1 de **Parse** : un type est un ensemble de valeurs, et un schéma doit pouvoir décrire des ensembles. Tu ajoutes les trois briques qui permettent de modéliser n'importe quelle donnée : le **singleton** (`literal`), l'**union** et le **tableau**. Le type TypeScript se déduit toujours du schéma.

Tu édites `parse.ts` (les briques du jalon 0 y sont déjà).

## Jalon 1 — `literal(value)`

Accepte exactement `value` (comparaison stricte). Sinon, `ParseError` avec le message `la valeur "x" est attendue` (la valeur en JSON).

## Jalon 2 — `union(...options)`

Essaie chaque schéma dans l'ordre et renvoie le résultat du premier qui accepte. Si aucun n'accepte : `ParseError(path, "aucune variante ne convient (raison1 | raison2)")`. Les erreurs qui ne sont pas des `ParseError` sont relancées. Le type de sortie est l'**union** des types des options.

## Jalon 3 — `array(item)`

Valide que l'entrée est un tableau et que chaque élément respecte `item`. Le chemin porte l'indice : `$[1]`, `$.points[1].x`.

## Contraintes

Pas de `any`. Une assertion `as` est justifiée dans `union` (commente-la).
