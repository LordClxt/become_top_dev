## Hint 1
Ne stocke pas les requêtes une par une : la file est une liste de lots `{ at, n }` (tick d'arrivée, nombre). Servir, c'est consommer la tête ; rejeter, c'est rogner la queue.

## Hint 2
Garde un `Map<attente, nombre>` : à chaque fois que tu prends `k` requêtes d'un lot arrivé au tick `at`, ajoute `k` à l'entrée `tick − at`. Le percentile parcourt les attentes triées en cumulant jusqu'à atteindre le rang ⌈q × N⌉.

## Hint 3
Pour le délai, une `Map<tick, instances>` des décisions suffit : au tick t, tu enregistres la décision pour `t + delayTicks` ; au début de chaque tick, tu appliques celle qui tombe, s'il y en a une.
