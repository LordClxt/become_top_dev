## Hint 1
`type LinkArgs<P extends string> = [keyof RouteParams<P>] extends [never] ? [] : [params: RouteParams<P>];`

## Hint 2
Pour l'enchaînement : `add<P extends string>(pattern: P, handler: (params: RouteParams<P>) => string): Router<Routes | P>`. Stocke les routes dans un tableau `{ pattern: string; handler: (params: Record<string, string>) => string }[]` et renvoie `this` : un `Router<Routes>` est assignable à `Router<Routes | P>`.

## Hint 3
`link` : `pattern.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''))` après avoir lu `const params: Record<string, string> = args[0] ?? {};`.
