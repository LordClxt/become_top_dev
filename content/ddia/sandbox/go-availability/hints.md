## Hint 1
`SeriesAvailability` est un produit (accumulateur initialisé à 1). `ParallelAvailability` accumule le produit des **indisponibilités** `(1 − a)` et renvoie `1 − ce produit`. Traite le cas sans composant à part.

## Hint 2
`DowntimePerYear` : `(1 - availability) * secondesParAn`, puis une conversion en `time.Duration`. Une année de 365 jours vaut `365 * 24 * time.Hour` ; `.Seconds()` donne sa valeur en flottant. Ramène d'abord `availability` dans `[0, 1]` avec `math.Min` et `math.Max`.

## Hint 3
`Nines` : `-math.Log10(1 - a)` vaut presque exactement 3 pour `a = 0,999`, mais peut tomber à 2,9999999 à cause des arrondis : ajoute une petite tolérance (par exemple `1e-9`) avant `math.Floor`. Traite à part `a >= 1` (logarithme de zéro) et `a < 0,9`.
