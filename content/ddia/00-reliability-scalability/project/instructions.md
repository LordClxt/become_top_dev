## Contexte

Tinybase, ton mini-système de données, n'a pour l'instant aucune visibilité sur sa propre performance. Tu écris `Recorder`, la brique de mesure que tous les modules suivants réutiliseront, en TypeScript : un histogramme par opération (`get`, `put`, `scan`…), fusionnable entre nœuds, avec vérification de SLO.

## Jalon 1 — Mesurer chaque opération
`new Recorder(bounds)`, `record(op, ms)`, `count(op)`, `quantile(op, p)`. Les bornes sont en **millisecondes**, hautes et incluses ; une tranche de débordement recueille le reste. Les durées sont des nombres de millisecondes, décimales comprises : 300 µs = `0.3`.

## Jalon 2 — Fusionner les nœuds
`ops()` (triées) et `merge(other)` : addition tranche par tranche, y compris pour les opérations absentes de `r`. `other` reste intact et indépendant. Bornes différentes : lève `BoundsMismatchError`, sans modification.

## Jalon 3 — SLO et budget d'erreur
`evaluate(slo, failed)` renvoie un `Verdict` : percentile observé, latence respectée (≤ seuil), et budget d'erreur = `floor((1 − Availability) × Count) − failed`. À 99,9 % sur 1 000 requêtes, on tolère 1 échec.

## Note
Le code du jalon 2 ressemble à celui du TP de la leçon 04 : c'est voulu, c'est la même idée appliquée à un système entier.
