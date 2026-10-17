## Hint 1
`retry` : une boucle `for` avec `try { return await task(); } catch (e) { last = e; }`, puis `throw last`.

## Hint 2
`Promise.allSettled(cities.map((city) => withTimeout(retry(() => weatherService.get(city), 2), timeoutMs)))` puis parcours les résultats avec leur indice.

## Hint 3
`Object.fromEntries([...Map.groupBy(readings, (r) => r.country)].map(([country, rs]) => [country, …]))`.
