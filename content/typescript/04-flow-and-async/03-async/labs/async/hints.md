## Hint 1
`return Promise.all([server.fetchJSON(a), server.fetchJSON(b)]);` — le type de retour est un tuple.

## Hint 2
`new Promise((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), ms))` annoté `Promise<never>`. Puis `Promise.race([promise, timeout(ms)])`.

## Hint 3
`const pending = new Map<string, Promise<unknown>>()`. À la première demande, stocke `server.fetchJSON(url).catch((e) => { pending.delete(url); throw e; })`.
