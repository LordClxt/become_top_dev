## Hint 1
`type MyRequired<T> = { [K in keyof T]-?: T[K] };` — le `-?` retire l'optionnalité.

## Hint 2
`type MyOmit<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] };` (ou `as Exclude<P, K>`).

## Hint 3
`omit` : copie l'objet (`{ ...obj }`), supprime les clés dans une copie typée `Partial<T>`… ou construis le résultat avec `Object.entries` et un filtre.
