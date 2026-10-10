## Hint 1
Pour `ParseSize`, sépare la chaîne en trois : partie entière, partie décimale, unité. Avec `1.5KiB`, calcule `1×1024 + 5×1024/10`. Pour que ce soit exact, multiplie d'abord, divise ensuite, et vérifie que la division tombe juste (`%`).

## Hint 2
Pour `FormatSize`, trouve le diviseur (`1024^k`) tant que `n / diviseur >= 1024`. La partie entière est `n / diviseur`, la décimale `(n % diviseur) * 10 / diviseur`. Attention : `*10` peut déborder un `int64` près du maximum, travaille en `uint64`.

## Hint 3
Le plus petit `int64` n'a pas d'opposé positif dans `int64` : prends la valeur absolue en `uint64` (`uint64(-(n+1)) + 1`). Pour `Percent`, calcule `float64(used) * 100 / float64(limit)` (multiplier avant de diviser évite un arrondi parasite à 80 %). Pour `Level`, ne passe pas par les flottants : 80 % de `limit`, arrondi vers le haut, vaut `limit - limit/5`. Pour `ParseSize`, le test de dépassement est `whole > (math.MaxInt64 - fraction) / unit`.
