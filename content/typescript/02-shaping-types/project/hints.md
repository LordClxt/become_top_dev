## Hint 1
Pour `tuple`, `Array.isArray(input) && input.length === items.length` valide la forme ; ensuite `items.map((item, i) => item.run(input[i], `${path}[${i}]`))`.

## Hint 2
`record` : `Object.entries(input)` parcourt les clés de l'objet reçu ; remplis une `new Map<string, T>()`. `partial` : enveloppe chaque schéma de `source.shape` avec `optional`.

## Hint 3
Pour `pick`, copie les clés demandées dans un nouvel objet `shape`, puis `object(shape)`. TypeScript ne sait pas que toutes les clés y sont : une assertion `as Pick<S, K>` est justifiée.
