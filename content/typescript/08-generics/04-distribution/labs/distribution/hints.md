## Hint 1
`type ToArray<T> = T extends unknown ? T[] : never;` et `type ToArrayND<T> = [T] extends [unknown] ? T[] : never;`.

## Hint 2
`type IsNever<T> = [T] extends [never] ? true : false;` — même idée pour `IsTrue`.

## Hint 3
`NTuple` : un helper récursif avec accumulateur, enveloppé dans `N extends number ? NTupleHelp<T, N, []> : never`. `isLessThan` : convertis une `Date` en nombre avec `getTime()`.
