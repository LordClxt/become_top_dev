## Contexte

Un faux serveur (`server.fetchJSON`) répond après un délai et compte ses appels. Tu écris par-dessus une petite couche réseau asynchrone : requêtes en parallèle, délai maximal, cache qui dédoublonne les requêtes simultanées.

Tu édites `fetching.ts`.

## À faire

1. `fetchBoth(a, b)` : lance les deux requêtes **en parallèle** et renvoie `[résultatA, résultatB]`.
2. `timeout(ms)` : une `Promise<never>` qui rejette avec `new Error('délai dépassé')` après `ms` millisecondes.
3. `withTimeout(promise, ms)` : la promesse si elle se résout à temps, sinon le rejet de `timeout`. Type de retour : `Promise<T>` (sans assertion).
4. `fetchWithCache(url)` : **toujours** une promesse. Deux appels simultanés pour la même URL ne déclenchent **qu'une** requête (cache de promesses). Si la requête échoue, elle est retirée du cache (un nouvel appel réessaie).

## Contraintes

Pas de callback imbriqué, pas de `any`.
