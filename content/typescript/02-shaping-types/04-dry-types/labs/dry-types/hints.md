## Hint 1
`Pick<State, 'userId' | 'pageTitle' | 'recentFiles'>`. Un type mappé s'écrit `{ [K in keyof Options]?: Options[K] }`.

## Hint 2
`typeof INIT_OPTIONS`, `ReturnType<typeof getUserInfo>` et `Action['type']` dérivent chacun un type d'une valeur ou d'un autre type.

## Hint 3
`Flip<T>` : `{ [K in keyof T as T[K]]: K }`. À l'exécution, parcours `Object.entries(record)` et écris `result[value] = key` ; TypeScript ne peut pas relier le résultat à `Flip<T>`, d'où l'assertion justifiée.
