## Hint 1
Les écritures passent par la couche de routage jusqu'aux partitions leaders, répliquées sur des followers.

## Hint 2
Les recherches passent par la couche de routage et interrogent une partition de l'index global ; il est mis à jour de façon asynchrone par les partitions.

## Hint 3
La couche de routage s'abonne à la coordination, où les partitions s'enregistrent. Aucun scatter/gather, aucun hash mod N.
