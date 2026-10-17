## Hint 1
Pour le tag : `Object.hasOwn(variants, kind)` refuse les clés héritées du prototype, contrairement à `kind in variants`.

## Hint 2
Réutilise `object(variants[kind]!)` pour valider la forme, puis ajoute le tag : `{ [tag]: kind, ...fields }`. TypeScript ne peut pas relier ce résultat à `TaggedUnion` : une assertion justifiée.

## Hint 3
Une date impossible comme `2023-02-29` est « corrigée » par `new Date` en `2023-03-01` : compare `date.toISOString().slice(0, 10)` à l'entrée.
