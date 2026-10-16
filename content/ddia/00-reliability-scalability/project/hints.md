## Hint 1
Garde un `Map<string, number[]>` : un tableau de `bounds.length + 1` compteurs par opération. `bounds.findIndex(b => ms <= b)` donne la tranche (`-1` → débordement).

## Hint 2
Copie les bornes avec `[...bounds]`. Pour `merge`, vérifie les bornes d'abord, puis additionne dans des compteurs que `this` possède (jamais le tableau de `other`). Les champs `#privés` de `other` sont lisibles depuis une méthode de la même classe.

## Hint 3
`evaluate` : `Math.floor((1 - availability) * count + 1e-9)`. Sans mesure, `quantile` renvoie 0 : la latence est respectée et le budget vaut 0 − failed.
