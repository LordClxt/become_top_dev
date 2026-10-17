## Contexte

Jalon 9 de **Parse**, et fin de la piste « Concevoir et durcir ses types ». Ce chapitre portait sur les tests de types, leur affichage, la récursion terminale et la génération de code. Les tests de types de ce jalon sont stricts (`Equals`) : un type correct mais non aplati échoue.

Tu édites `parse.ts` (les jalons précédents sont fournis).

## Jalon 1 — `looseObject(shape)`

Comme `object`, mais les champs dont le schéma accepte `undefined` deviennent des propriétés **optionnelles** (`age?: number`) et sont absents du résultat quand ils valent `undefined`. Écris `Resolve<T>` et utilise-le pour que `InferOptional<S>` s'affiche (et se compare) comme un objet plat.

## Jalon 2 — `tupleOf(item, n)`

Un tableau d'exactement `n` éléments validés par `item`, de type `NTuple<T, N>`. Les tests utilisent `N = 60` : `NTuple` doit être récursif **terminal**.

## Jalon 3 — `fromSpec(spec)` et `toTypeScript(name, spec)`

Une spécification compacte (`'string'`, `'number[]'`, `'boolean?'`…) donne à la fois un schéma (dont le type de sortie `SpecType<S>` est calculé) et le code source d'une interface. C'est l'idée de la leçon 4 : quand une description existe, on peut en générer les types plutôt que de les écrire.

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
