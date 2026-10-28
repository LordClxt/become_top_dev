## Hint 1
Calcule tous les délais d'avance avec `backoffDelays`, puis boucle sur les tentatives : dans le `catch`, décide si tu relances (tentatives restantes et erreur retentable) ou si tu propages.

## Hint 2
Pour le disjoncteur, trois données suffisent : le nombre d'échecs consécutifs, l'instant d'ouverture (ou `undefined`), et un drapeau « essai en cours ». L'état se **calcule** à partir de l'instant d'ouverture et de l'horloge. Libère le drapeau dans un `finally`.

## Hint 3
La convolution de deux distributions : pour chaque couple (a, pa) × (b, pb), ajoute pa × pb à l'entrée a + b. Normalise chaque distribution d'entrée par la somme de ses poids. Pour le percentile, cumule les probabilités dans l'ordre des latences croissantes.
