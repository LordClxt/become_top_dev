## Contexte

Une boutique de cartes de visite. Son code utilise des sentinelles partout : `-1` pour « absent », `-1` pour « payé en crédits ». Tu les remplaces par des types distincts.

Tu édites `special.ts`.

## À faire

1. `safeIndexOf(vals, val)` : l'indice, ou `null`.
2. `splitAround(vals, val)` : `[avant, après]` ; si `val` est absent, `[copie de vals, []]`.
3. `Price` : union taguée `{ kind: 'dollars'; amount: number } | { kind: 'credits'; count: number }`. `fromLegacy(priceDollars, credits)` convertit l'ancien format (`-1` → crédits, avec le nombre de crédits fourni).
4. `totals(prices)` : `{ dollars, credits }` (sommes séparées, dollars arrondis au centime).
5. `lookup(map, key)` : `{ status: 'found'; value } | { status: 'missing' } | { status: 'forbidden' }` ; les clés qui commencent par `_` sont interdites.

## Contraintes

Aucune valeur `-1` en sortie. Pas de `any`.
