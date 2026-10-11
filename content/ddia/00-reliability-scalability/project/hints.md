## Hint 1
Stocke un `[]int` de `len(bounds)+1` cases par opération dans une map. `sort.SearchFloat64s(bounds, ms)` donne l'indice de la tranche.

## Hint 2
Convertis la durée sans tronquer : `float64(d) / float64(time.Millisecond)`. Pour `Merge`, vérifie les bornes d'abord, puis additionne dans des compteurs que `r` possède (jamais la slice de `other`).

## Hint 3
`Evaluate` : `allowed := int(math.Floor((1-a)*float64(count) + 1e-9))`. Sans mesure, `Quantile` renvoie 0 : la latence est respectée et le budget vaut 0 − failed.
