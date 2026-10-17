## Hint 1
`type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;`

## Hint 2
`type IsAny<T> = 0 extends 1 & T ? true : false;` — `1 & T` vaut `never` sauf si `T` est `any`. `Assignable` : `[From] extends [To] ? true : false`.

## Hint 3
`export function assertType<T>() { return <V>(value: V & (Equals<V, T> extends true ? unknown : never)): V => value; }` — si `V` n'est pas exactement `T`, le paramètre devient `never` et l'appel est refusé.
