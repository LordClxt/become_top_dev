## Hint 1
`type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };`

## Hint 2
`type PartiallyPartial<T extends object, K extends keyof T> = [K] extends [never] ? T : Resolve<Partial<Pick<T, K>> & Omit<T, K>>;`

## Hint 3
`withDefaults` : `{ ...defaults, ...overrides }` a pour type une intersection plus large ; une double assertion (`as unknown as …`) vers le type résolu est justifiée.
