## Contexte

Tu réécris quelques types utilitaires de la bibliothèque standard (sans les utiliser), puis des fonctions génériques qui s'en servent. Les tests de types comparent tes résultats aux types attendus, et vérifient que les mauvais usages sont **refusés** à l'appel.

Tu édites `utilities.ts`. Interdit : `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record` dans tes définitions.

## À faire

1. `MyPartial<T>`, `MyRequired<T>`, `MyReadonly<T>`.
2. `MyPick<T, K>` : `K` doit être une clé de `T` (contrainte).
3. `MyOmit<T, K>` : `K` doit être une clé de `T` ; utilise un type mappé avec `as` et `Exclude`.
4. `MyRecord<K, V>` : `K` limité à `PropertyKey`.
5. `pick(obj, ...keys)` et `omit(obj, ...keys)` : fonctions génériques qui renvoient `MyPick` / `MyOmit` (une assertion justifiée chacune).

## Contraintes

Pas de `@ts-expect-error` ni d'intersection `& PropertyKey` dans tes définitions.
