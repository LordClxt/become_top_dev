## Hint 1
`['GET', …] as const` puis `(typeof METHODS)[number]`. Pour `includes`, élargis le tableau : `(METHODS as readonly string[]).includes(s)`.

## Hint 2
`const routes = { … } satisfies Record<string, Route>;` et `type RouteName = keyof typeof routes;`. Les propriétés `method` sont vérifiées contre `HttpMethod` par satisfies.

## Hint 3
`function tuple<T extends unknown[]>(...elements: T): T`. Pour findRoute, parcours `Object.entries(routes)` ; la clé est une `string` : une assertion `as RouteName` est justifiée.
