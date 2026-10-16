## Hint 1
`hashPartition` : `Math.floor(hash(key) * parts / 2 ** 32)`. Chaque partition reçoit une tranche contiguë de l'espace des hachages.

## Hint 2
`locate` : la partition d'une clé est le nombre de bornes inférieures ou égales à la clé (recherche binaire sur `bounds`).

## Hint 3
`addNode` : tant que le nouveau nœud a moins de `floor(taille / (nœuds + 1))` partitions, prends la partition de plus grand numéro du nœud le plus chargé (`pickMost`, à égalité le plus petit nom).

## Hint 4
Index global : `put` touche la partition du document plus les partitions d'index **distinctes** de ses termes (un `Set`) ; `query` ne lit que la partition du terme.
