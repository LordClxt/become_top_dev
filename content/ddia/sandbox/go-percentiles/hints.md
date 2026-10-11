## Hint 1
Pour `Percentile`, clone d'abord la slice (`slices.Clone`), trie la copie, calcule le rang avec `math.Ceil`, puis ramène-le entre 1 et `len`.

## Hint 2
`Histogram.Observe` : `sort.SearchFloat64s(bounds, v)` renvoie l'indice de la première borne `>= v`, soit exactement la bonne tranche (et `len(bounds)` pour le débordement). `counts` a donc `len(bounds)+1` cases.

## Hint 3
`Quantile` : calcule le même rang que `Percentile`, parcours `counts` en cumulant jusqu'à atteindre le rang ; l'indice de la tranche donne la borne (ou `+Inf` si c'est la dernière). Vérifie les bornes dans `Merge` avec `slices.Equal` avant de toucher aux comptes.
