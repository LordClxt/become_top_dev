## Contexte

Tu écris le client d'API d'une boutique. Il doit être **typé de bout en bout** (chaque route connaît sa réponse), **robuste** (délai maximal, nouvelles tentatives) et **économe** (les requêtes identiques simultanées sont partagées). Puis tu t'en sers pour produire un rapport de ventes en style fonctionnel.

Tu édites `client.ts`. Le transport (`Transport`) est injecté : les tests en fournissent un faux.

## À faire

1. `Client<API>` : `new Client<ShopAPI>(transport, { timeoutMs, retries })`.
   - `get(path)` (générique sur `Path extends keyof API & string`) renvoie `Promise<API[Path]>`.
   - Chaque tentative est limitée à `timeoutMs` ; jusqu'à `retries` tentatives **supplémentaires** en cas d'échec.
   - Cache de promesses : un deuxième `get` du même chemin (pendant ou après la requête) ne rappelle pas le transport ; un échec définitif est retiré du cache.
   - `invalidate(path?)` vide le cache d'un chemin, ou tout le cache.
   - `stats()` : `{ requests, hits }` (appels au transport, `get` servis par le cache).
2. `getAll(paths)` : toutes les routes en parallèle ; le résultat est un **tuple typé** (`getAll(['/products', '/orders'] as const)` → `Promise<[Product[], Order[]]>`).
3. `salesReport(products, orders)` : `{ revenueByCategory, topProduct }` — chiffre d'affaires par catégorie (prix × quantité, arrondi au centime) et nom du produit le plus vendu en quantité (`undefined` sans commande). Les lignes de commande vers un produit inconnu sont ignorées.

## Contraintes

Pas de `any`. Une assertion `as` justifiée pour la réponse du transport, une pour le tuple de `getAll`.
