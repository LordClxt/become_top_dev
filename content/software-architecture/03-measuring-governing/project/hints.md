## Hint 1
Pour P, un union-find sur les nœuds : chaque arête unit ses deux extrémités, P = nombre de racines distinctes.

## Hint 2
L'algorithme de Tarjan trouve les composantes fortement connexes en un parcours : chaque nœud reçoit un `index` et un `low` (le plus petit index atteignable) ; quand `low === index`, on dépile une composante. Pour éviter la récursion, garde ta propre pile de cadres `{ node, i }` (i = prochain voisin à visiter).

## Hint 3
Le cliquet n'est que de l'arithmétique d'ensembles : `added = current − baseline`, `fixed = baseline − current`. Si `added` est vide, la nouvelle référence est `baseline ∩ current`.
