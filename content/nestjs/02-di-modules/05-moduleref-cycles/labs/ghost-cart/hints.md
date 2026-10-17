## Hint 1
Un état en mémoire qui « disparaît » entre deux requêtes : soit il est stocké dans une instance qui n'est pas la même d'une requête à l'autre, soit il y a deux instances. Compte combien de fois le constructeur de `CartService` est appelé.

## Hint 2
Symptôme 1 : `AuditLogger` est request-scoped. Qu'arrive-t-il à ceux qui l'injectent ? Symptôme 2 : combien de modules déclarent `CartService` dans leurs `providers` ?

## Hint 3
Sépare l'état (les paniers) dans un singleton qui ne dépend pas de la requête, et injecte-le dans `CartService`. Exporte ce singleton depuis `CartModule`, et fais importer `CartModule` par `StatsModule` au lieu de redéclarer.
