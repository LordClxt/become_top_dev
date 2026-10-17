## Hint 1
Écris une méthode privée `attempt(path)` : une boucle de `retries + 1` tentatives, chacune `Promise.race([this.transport(path), timeout(ms)])`.

## Hint 2
Cache : `Map<string, Promise<unknown>>`. Au premier `get`, stocke `this.attempt(path).catch((e) => { this.cache.delete(path); throw e; })`.

## Hint 3
`getAll<const P extends readonly (keyof API & string)[]>(paths: P): Promise<{ -readonly [I in keyof P]: API[P[I]] }>` — `Promise.all(paths.map(...))` donne un tableau ; l'assertion vers le tuple mappé est justifiée.
