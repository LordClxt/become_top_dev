## Hint 1
Les clés optionnelles : `{ [K in keyof S]: undefined extends Infer<S[K]> ? K : never }[keyof S]`. Puis `Resolve<{ [K in Exclude<keyof S, Opt>]: … } & { [K in Opt]?: Exclude<Infer<S[K]>, undefined> }>`.

## Hint 2
`type NTupleHelp<T, N extends number, Acc extends unknown[]> = Acc['length'] extends N ? Acc : NTupleHelp<T, N, [...Acc, T]>;` et la distribution sur `N` (module 08).

## Hint 3
`SpecType` : retire le `?` (`F extends \`${infer R}?\` ? R : F`), puis teste `\`${infer B}[]\``. À l'exécution, construis une shape avec `string()`, `number()`, `boolean()`, `array(...)` et `optional(...)`, puis réutilise `looseObject`.
