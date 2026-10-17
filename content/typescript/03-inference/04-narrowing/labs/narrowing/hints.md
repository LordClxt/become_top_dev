## Hint 1
Pour describe, l'ordre compte : `value === null`, puis `typeof`, `instanceof Date`, et le tableau en dernier. `toISOString().slice(0, 10)` donne la date.

## Hint 2
`function isDefined<T>(x: T | null | undefined): x is T { return x !== null && x !== undefined; }`

## Hint 3
`const { bbox } = polygon; if (!bbox) return undefined; const { x, y } = bbox;` puis compare `pt.x` à `x[0]` et `x[1]`.
