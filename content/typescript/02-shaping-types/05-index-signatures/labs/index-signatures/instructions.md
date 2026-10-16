## Contexte

Un petit lecteur de CSV et quelques types de données. Chaque endroit où le starter écrit une signature d'index (`{ [k: string]: … }`) ou `any` est trop imprécis. Tu choisis à chaque fois le bon outil : `Map` pour les clés dynamiques, interface pour les clés connues, `Record` pour un ensemble fini de clés, `Iterable` et `ArrayLike` pour les suites.

Tu édites `csv.ts`.

## À faire

1. `Row` = `Map<string, string>`. `parseCSV(input)` : première ligne = en-têtes, lignes vides ignorées, espaces autour des cellules retirés ; un nombre de colonnes incohérent lève `RangeError`. Entrée vide ou en-têtes seuls : `[]`.
2. `Rocket` = interface `{ name: string; variant: string; thrustKn: number }`. `toRocket(row)` lit les colonnes `name`, `variant`, `thrust` ; colonne manquante ou poussée non numérique : `TypeError`.
3. `Vec3D` = exactement `x`, `y`, `z`. `addVec(a, b)` les additionne.
4. `sumAll(xs)` accepte tout `Iterable<number>`.
5. `first(xs)` renvoie le premier élément d'un `ArrayLike<T>` (tableau, chaîne…), ou `undefined` s'il est vide.

## Contraintes

Pas de `any`, pas de signature d'index pour des clés connues.
