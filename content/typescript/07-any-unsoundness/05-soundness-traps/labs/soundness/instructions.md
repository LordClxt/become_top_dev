## Contexte

Une ferme numérique dont le code compile… et plante. Chaque fonction illustre un piège d'unsoundness de la leçon. Tu les corriges pour que les types redeviennent vrais.

Tu édites `farm.ts`.

## À faire

1. `nth(xs, i)` : renvoie `T | undefined` (indices négatifs ou hors limites → `undefined`).
2. `countLegs(animals)` ne doit pas pouvoir modifier le tableau : paramètre `readonly Animal[]`. `withAnimal(animals, animal)` renvoie un **nouveau** tableau `Animal[]`.
3. `Feeder` : change la déclaration de `feed` en **propriété** de type fonction, pour que les tests de types refusent un nourrisseur trop restrictif.
4. `announce(fact, beforePrint)` : renvoie `"Ada : les poules ont des dents"` ou `"anonyme : …"`. `beforePrint` peut modifier `fact` (même supprimer `author`) : la valeur affichée est celle d'**avant** l'appel.

## Contraintes

Pas de `any`, pas d'assertion `as`, pas de `!`.
