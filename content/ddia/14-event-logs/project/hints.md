## Hint 1
Après une compaction, les offsets d'une partition ne sont plus contigus : dans `Read`, ne calcule pas l'index par `from` ; cherche le premier message d'offset `>= from` (`sort.Search` fait l'affaire). Et renvoie `append([]Message{}, ...)` pour une copie non nil.

## Hint 2
`Commit` crée la map du groupe à la demande ; `Committed` peut lire `l.commits[group][p]` directement, car lire une map nil renvoie la valeur zéro. `Poll` n'est qu'un `Read` depuis `Committed`. Pour `Assign`, copie la slice avant de la trier et initialise chaque consommateur à `[]int{}`.

## Hint 3
`Compact` en deux passes : une pour noter le dernier offset de chaque clé, une pour garder les messages dont l'offset est ce dernier offset (en sautant les tombstones si `dropTombstones`). `CatchUp` : pour chaque partition, `Poll` tout, applique, puis `Commit` à `l.next[p]`.
