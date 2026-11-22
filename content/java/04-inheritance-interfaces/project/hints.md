## Hint 1
M1 : remplace le champ `Money limit` (null = marché) par un champ `Pricing pricing`. Le builder part de `new Pricing.Market()` et passe à `new Pricing.Limit(price)` ; le record valide le prix. `limit()` se dérive : `pricing instanceof Pricing.Limit(Money price) ? Optional.of(price) : Optional.empty()`.

## Hint 2
M2 : la composition de la leçon 1. Si `CountingJournal` redéfinit `recordAll` en comptant la taille du lot **et** en appelant `Journal.super.recordAll(...)`, ce dernier rappelle **ton** `record` : double compte. Le plus sûr : ne compter que dans `record`, et laisser le `recordAll` par défaut de `Journal` passer par lui.

## Hint 3
M3 : chaque record implémente `Money on(Money notional)` ; `Rate` calcule `Money.ofMinor(notional.minorUnits() * basisPoints / 10_000, notional.currency())` (attention au débordement : `Math.multiplyExact`). `Trade.commission(c)` renvoie `c.on(notional())`.
