## Hint 1
`export function enumeration<const T extends string>(values: readonly [T, ...T[]])`. Pour tester l'appartenance, écris un type guard local `(input: unknown): input is T` qui utilise `(values as readonly string[]).includes(...)` (ou une variable `readonly string[]`).

## Hint 2
`refine` : `const value = inner.run(input, path); if (!guard(value)) throw …; return value;` — après le test, `value` est rétréci en `U`.

## Hint 3
`withDefault` : `input === undefined ? fallback : inner.run(input, path)`.
