## Contexte

Tu manipules les types comme des ensembles de valeurs : union, intersection, différence, inclusion. Chaque type du fichier `sets.ts` vaut pour l'instant `never` ou `unknown` : tu les remplaces par la bonne définition. Les tests de types utilisent `Equals`, qui exige que deux types soient **exactement** le même ensemble.

## À faire

1. `Weekday` (lundi à vendredi : `'mon'` … `'fri'`), `Weekend` (`'sat' | 'sun'`), `Day` (leur union).
2. `isWeekend(day)` doit être une **garde de type** : dans le `if`, `day` est un `Weekend`, dans le `else` un `Weekday`.
3. `Person` : l'ensemble des valeurs qui sont à la fois `Named` **et** `Aged`. `makePerson` en fabrique une.
4. `SharedKeys<A, B>` (clés communes) et `AllKeys<A, B>` (clés de l'un ou de l'autre), avec `keyof`.
5. `Without<T, U>` : retire de `T` les membres qui sont dans `U`. Indice : un type conditionnel `T extends U ? … : …` **se distribue** sur les membres d'une union.
6. `swap` prend une **paire** `readonly [number, number]` et renvoie une nouvelle paire échangée.

## Contraintes

Pas de `any`. Pas d'utilitaire de la bibliothèque (`Exclude`, `Extract`) pour `Without`.
