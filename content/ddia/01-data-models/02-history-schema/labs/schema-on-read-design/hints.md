## Hint 1
Pense à l'ordre des dépendances : on ne peut pas migrer un document dont on ne connaît pas la version.

## Hint 2
`strings.Cut` coupe au premier séparateur : tout le reste va dans la seconde valeur.

## Hint 3
Une migration en une transaction sur 500 millions de lignes bloque tout ; l'alternative consiste à ne pas migrer tout de suite.
