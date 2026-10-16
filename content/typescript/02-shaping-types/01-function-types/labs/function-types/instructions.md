## Contexte

Deux familles de fonctions : des opérations qui ont **la même forme**, et un wrapper de `fetch` dont le bug (`return new Error` au lieu de `throw`) échappe à TypeScript tant qu'on annote seulement les paramètres. Tu appliques un type à des **expressions de fonction entières**.

Tu édites `fetching.ts`.

## À faire

1. `BinaryFn` : deux nombres → un nombre. `add`, `sub`, `mul`, `div` sont des expressions de fonction annotées avec `BinaryFn`. `div` lève `RangeError` si le diviseur est `0`.
2. `checkedFetch` est une `const` de type `typeof fetch` : elle appelle `fetch`, et si `response.ok` est faux, elle **lève** `Error('Request failed: <statut>')`. Laisse l'annotation te montrer le bug du starter.
3. `FetchArgs` : les paramètres de `fetch` (`Parameters`). `fetchText(...args)` renvoie le texte d'une réponse obtenue via `checkedFetch`.

## Contraintes

Pas de `any`. Les tests de types exigent que `typeof checkedFetch` soit **exactement** `typeof fetch`.
