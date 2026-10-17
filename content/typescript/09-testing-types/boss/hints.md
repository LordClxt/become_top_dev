## Hint 1
Reprends `Resolve`, `Strip` et `OptionalKeys` du projet Parse : `ResponseOf<R> = Resolve<{ [K in Required]: FieldType<R[K]> } & { [K in Optional]?: FieldType<R[K]> }>`.

## Hint 2
`PathParams` terminal : `type Help<P, Acc extends string> = P extends \`${string}:${infer Name}/${infer Rest}\` ? Help<Rest, Acc | Name> : P extends \`${string}:${infer Name}\` ? Acc | Name : Acc;` puis `{ [K in Help<P, never>]: string }`.

## Hint 3
Pour valider un champ : retire `?`, puis `[]` ; pour un tableau, `Array.isArray(v) && v.every((x) => typeof x === base)`. Construis le client avec `Object.fromEntries(Object.entries(spec).map(...))` puis une double assertion (`as unknown as Client<S>`).
