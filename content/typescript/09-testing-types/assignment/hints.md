## Hint 1
Le modificateur `const` sur les paramètres de type garde les littéraux : `function zip<const A extends readonly unknown[], const B extends readonly unknown[] & { length: A['length'] }>(a: A, b: B)`. Le type de sortie : un type récursif terminal `Zip<A, B, Acc>` qui découpe les deux tuples avec `infer`.

## Hint 2
`fromPairs<const P extends readonly (readonly [PropertyKey, unknown])[]>(pairs: P)` : `Resolve<{ [E in P[number] as E[0]]: E[1] }>`.

Pour `invert`, pense à `-readonly` : le modificateur `const` rend les propriétés de `T` en lecture seule.

## Hint 3
`type ReverseHelp<T extends readonly unknown[], Acc extends unknown[]> = T extends readonly [infer F, ...infer R] ? ReverseHelp<R, [F, ...Acc]> : Acc;`
