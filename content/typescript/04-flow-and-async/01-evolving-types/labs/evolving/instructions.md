## Contexte

Quatre fonctions qui accumulent des valeurs. Les tests vérifient leurs **types de retour inférés** : tu ne dois annoter aucun retour, ni aucun tableau. C'est le mécanisme des types évolutifs qui doit produire les bons types.

Tu édites `collect.ts`.

## À faire

1. `range(start, limit)` : les entiers de `start` (inclus) à `limit` (exclu). Type de retour inféré : `number[]`.
2. `tokenize(text)` : découpe sur les espaces ; un mot entièrement numérique devient un `number`, les autres restent des chaînes (`"a 12 b"` → `['a', 12, 'b']`). Retour inféré : `(string | number)[]`.
3. `parseOrNull(text)` : `JSON.parse` dans un `try/catch` ; renvoie le résultat si c'est un nombre, sinon `null`. Retour inféré : `number | null` (pars de `let result = null`).
4. `squaresOf(xs)` : les carrés, en partant d'un tableau vide et d'une boucle (pas de `forEach`). Retour inféré : `number[]`.

## Contraintes

Aucune annotation de retour, aucune annotation de tableau ou de variable locale.
