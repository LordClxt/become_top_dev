## Hint 1
`type Merge<A, B> = { [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never };` puis `object({ ...a.shape, ...b.shape } as Merge<A, B>)`.

## Hint 2
`camelize` : valide avec `source.run(input, path)`, puis renomme les clés avec `Object.fromEntries`.

## Hint 3
`const isPrefixed = (s: string): s is \`${P}${string}\` => s.startsWith(prefix);` puis `refine(string(), isPrefixed, message)`.
