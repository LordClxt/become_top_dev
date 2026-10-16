## Hint 1
`literal` est un `schema` dont le test est `input !== value`. Le paramètre générique `T extends string | number | boolean | null` fait que `literal('admin')` a le type `'admin'` et non `string`.

## Hint 2
Dans `union`, une boucle `for` avec `try`/`catch` : retourne dès qu'une option réussit, collecte les `e.message` des `ParseError` sinon. Relance (`throw e`) tout ce qui n'est pas une `ParseError`.

## Hint 3
Pour `array`, utilise `Array.isArray(input)` (qui affine `unknown`) puis `input.map((element, index) => item.run(element, `${path}[${index}]`))`.
