## Hint 1
`if (!(input instanceof ctor)) throw …; return input;` : `instanceof` rétrécit `unknown` vers `T` grâce au type du constructeur.

## Hint 2
`export function is<T>(s: Schema<T>, value: unknown): value is T { return s.safeParse(value).success; }` et `export function assertValid<T>(s: Schema<T>, value: unknown): asserts value is T { s.parse(value); }`.

## Hint 3
`strict` : vérifie les clés avec `Object.hasOwn(source.shape, key)`, puis délègue à `source.run(input, path)` ; renvoie `{ ...base, shape: source.shape }`.
