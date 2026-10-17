## Contexte

Cinq petites fonctions qui reçoivent des unions et doivent les **rétrécir** correctement, sans `as` ni `!`. Chacune exerce un outil de la leçon : tests de type, type guard, union taguée, alias.

Tu édites `narrow.ts`.

## À faire

1. `describe(value)` : `null` → `"rien"`, une chaîne → `"texte (N)"` (N = longueur), un nombre → `"nombre N"` (y compris `0`), une `Date` → `"date AAAA-MM-JJ"` (ISO), un tableau → `"liste de N"`.
2. `isDefined(x)` est un **type guard** (ni `null` ni `undefined`) ; `compact(xs)` l'utilise avec `filter` et renvoie un `T[]`.
3. `area(shape)` : `switch` sur `kind` (cercle `π r²`, rectangle `w × h`, carré `side²`), avec un cas `default` qui vérifie l'exhaustivité (`const never: never = shape`).
4. `inBoundingBox(polygon, pt)` : `undefined` si le polygone n'a pas de `bbox`, sinon si le point est dans la boîte (bornes incluses). Utilise la décomposition.
5. `increment(counts, word)` : renvoie une **nouvelle** `Map` où le compteur de `word` est augmenté de 1 (`get` + `??`, pas de `!`).

## Contraintes

Aucun `as`, aucun `!`.
