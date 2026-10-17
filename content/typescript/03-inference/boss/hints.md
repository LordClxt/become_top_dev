## Hint 1
Commence par `if (typeof raw !== 'object' || raw === null) return null; const r = raw as Record<string, unknown>;` puis teste chaque champ avec `typeof`. Un type guard `isKind(s: unknown): s is EventKind` aide.

## Hint 2
Dans `parseEvent`, un `switch (kind)` sur la valeur rétrécie construit l'objet final, champ par champ : c'est ce qui élimine les champs inconnus.

## Hint 3
Pour `report`, `events.filter(isPurchase)` donne des `Purchase[]`. `...(purchases.length > 0 ? { revenue } : {})` et pareil pour `lastPath`.
