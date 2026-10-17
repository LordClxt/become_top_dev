## Hint 1
`numberIn` : réutilise `number().run(input, path)` puis vérifie les contraintes dans l'ordre : entier, min, max.

## Hint 2
`json` : une fonction récursive `check(input, path): Json`. Teste `null`, les primitives, `Number.isFinite`, `Array.isArray`, puis `Object.getPrototypeOf(input)` pour les objets.

## Hint 3
`lazy` : une variable `let inner: Schema<T> | undefined` dans la fermeture ; `inner ??= factory();`.
