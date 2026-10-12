## Hint 1
`HashPartition` : multiplie le hachage (sur 64 bits) par le nombre de partitions puis décale de 32 bits vers la droite. Chaque partition reçoit une tranche contiguë.

## Hint 2
`Locate` : la partition d'une clé est le nombre de bornes inférieures ou égales à la clé (`sort.Search`).

## Hint 3
`AddNode` : tant que le nouveau nœud a moins de `len(a) / (nœuds+1)` partitions, prends la partition de plus grand numéro du nœud le plus chargé (à égalité, le plus petit nom).

## Hint 4
Index global : `Put` touche la partition du document plus les partitions d'index **distinctes** de ses termes ; `Query` ne lit que la partition du terme.
