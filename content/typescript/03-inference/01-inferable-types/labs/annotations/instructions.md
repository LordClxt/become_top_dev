## Contexte

Un petit module de cotations boursières. Le code d'origine renvoyait tantôt un nombre, tantôt une promesse ; les types affichés étaient illisibles et des annotations redondantes encombraient tout. Tu le réécris en **annotant seulement là où c'est utile** : les paramètres et les types de retour qui sont des contrats.

Tu édites `quotes.ts`.

## À faire

1. `getQuote(ticker)` renvoie **toujours** une `Promise<number>` (annote le retour). Une cotation déjà en cache est renvoyée sans appeler `fetchPrice` ; sinon, la valeur obtenue est mise en cache.
2. `add(a, b)` renvoie un `Vector2D` (type nommé dans la signature).
3. `formatProduct(product)` renvoie `"Elmo (#7) : 28.99 €"` ; utilise la décomposition, sans annotation locale.
4. `parseQuantity(input)` renvoie un entier positif ou nul, ou `null` si la chaîne n'en est pas un (`"12"` → `12`, `" 3 "` → `3`, `"1.5"`, `"-2"`, `""`, `"abc"` → `null`). Plusieurs `return` : annote le retour `number | null`.

## Contraintes

Pas d'annotation sur les variables locales.
