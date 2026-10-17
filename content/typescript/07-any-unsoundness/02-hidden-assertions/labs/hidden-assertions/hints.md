## Hint 1
`if (typeof data !== 'object' || data === null || !('name' in data) || typeof data.name !== 'string') throw …` puis `return data as MountainPeak;`.

## Hint 2
`shallowObjectEqual` : un `Object.entries(a)` et `(b as Record<string, unknown>)[k]` après `k in b`.

## Hint 3
`function cacheLast<F extends (...args: any[]) => unknown>(fn: F): F` (un `any[]` dans une contrainte générique est la forme idiomatique de « n'importe quelle fonction » : ce n'est pas un paramètre `any`) ; la fonction interne prend `(...args: unknown[])`, et `return cached as unknown as F;`.
