## Contexte

Les labs de ce cours utilisent `Equals` et `Expect` sans que tu les aies écrits. Cette fois, tu construis toi-même la boîte à outils, et les tests vérifient qu'elle fait les distinctions qu'un test naïf rate (`any` contre `unknown`, `readonly`, optionnels, types plus précis).

Tu édites `kit.ts`. Le fichier de tests de types utilise **tes** définitions.

## À faire

1. `Equals<X, Y>` : `true` si les types sont identiques, `false` sinon (astuce des fonctions génériques).
2. `Expect<T extends true>` et `ExpectFalse<T extends false>`.
3. `IsAny<T>` : `true` seulement pour `any` (indice : `0 extends 1 & T`).
4. `Assignable<From, To>` : `true` si `From` est assignable à `To` (sans distribution).
5. `assertType<T>()(value)` : une fonction curryfiée (module 04 !) qui ne fait rien à l'exécution mais n'accepte que des valeurs **exactement** de type `T` : `assertType<number[]>()(xs)`. Elle renvoie la valeur.

## Contraintes

Pas de `any` en dehors de `IsAny`. Ces types ne servent qu'à la compilation.
