## Contexte

Jalon 8 de **Parse**. Ce chapitre portait sur la programmation au niveau des types : génériques comme fonctions, types conditionnels, littéraux de gabarit. Les types de sortie de tes schémas vont désormais se **calculer**.

Tu édites `parse.ts` (les jalons précédents sont fournis).

## Jalon 1 — `merge(a, b)`

Fusionne deux schémas d'objets ; pour une clé commune, le schéma de `b` l'emporte. `Merge<A, B>` doit être un **type mappé** (une intersection `A & B` donnerait `string & number` pour une clé commune, et s'afficherait mal).

## Jalon 2 — `camelize(objectSchema)`

L'entrée a des clés `snake_case` (celles du schéma), la sortie des clés `camelCase`. Écris `ToCamel<S>` (récursif, avec `infer` et `Capitalize`) ; le type de sortie utilise un type mappé avec `as`. Les chemins d'erreur gardent les noms d'entrée (`$.first_name`).

## Jalon 3 — `startsWith(prefix)`

Une chaîne qui commence par `prefix` ; type de sortie `` `${P}${string}` `` (réutilise `refine` avec un type guard).

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
