## Hint 1
Découper avec `ids[i:j]` est correct pour la lecture. Le problème, c'est la capacité de chaque lot : elle s'étend jusqu'à la fin de `ids`.

## Hint 2
La full slice expression `s[début:fin:max]` fixe la capacité à `max - début`. Quelle valeur de `max` empêche tout débordement ?

## Hint 3
Pour chaque lot, calcule `end := min(i+n, len(ids))` puis ajoute `ids[i:end:end]` au résultat.
