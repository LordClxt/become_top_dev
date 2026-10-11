## Contexte

Tinybase, ton mini-système de données, n'a pour l'instant aucune visibilité sur sa propre performance. Tu écris `Recorder`, la brique de mesure que tous les modules suivants réutiliseront : un histogramme par opération (`get`, `put`, `scan`…), fusionnable entre nœuds, avec vérification de SLO.

## Jalon 1 — Mesurer chaque opération
`NewRecorder(bounds)`, `Record(op, d)`, `Count(op)`, `Quantile(op, p)`. Les bornes sont en **millisecondes**, hautes et incluses ; une tranche de débordement recueille le reste. Les durées inférieures à la milliseconde comptent (300 µs = 0,3 ms).

## Jalon 2 — Fusionner les nœuds
`Ops()` (triées) et `Merge(other)` : addition tranche par tranche, y compris pour les opérations absentes de `r`. `other` reste intact et indépendant. Bornes différentes : `ErrBoundsMismatch`, sans modification.

## Jalon 3 — SLO et budget d'erreur
`Evaluate(slo, failed)` renvoie un `Verdict` : percentile observé, latence respectée (≤ seuil), et budget d'erreur = `floor((1 − Availability) × Count) − failed`. À 99,9 % sur 1 000 requêtes, on tolère 1 échec.

## Note
Le code du jalon 2 ressemble à celui du TP de la leçon 04 : c'est voulu, c'est la même idée appliquée à un système entier.
