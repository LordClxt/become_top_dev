## Contexte

Un exercice surtout au niveau des types : tu écris des types conditionnels en choisissant, pour chacun, s'il doit **distribuer** sur les unions ou non. Les tests de types vérifient les résultats sur des unions, sur `boolean` et sur `never`.

Tu édites `distribution.ts`.

## À faire

1. `ToArray<T>` distributif : `ToArray<string | number>` = `string[] | number[]`. `ToArrayND<T>` non distributif : `(string | number)[]`.
2. `IsNever<T>` : `true` pour `never`, `false` sinon.
3. `IsTrue<V>` : `true` seulement pour `true` (pas pour `boolean`).
4. `Comparable<T>` (non distributif, version de la leçon) et `isLessThan(a, b)` : compare deux dates, deux nombres (une date peut aussi être comparée à un nombre de millisecondes) ou deux chaînes.
5. `NTuple<T, N>` : un tuple de `N` éléments, distributif sur `N`. `repeat(value, n)` le construit à l'exécution.

## Contraintes

Pas de `any`. Une seule assertion autorisée, dans `repeat`.
