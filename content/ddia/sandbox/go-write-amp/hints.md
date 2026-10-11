## Hint 1
Garde un tableau `counts[niveau]` : le nombre de SSTables à chaque niveau. Un flush ajoute une SSTable au niveau 0.

## Hint 2
Boucle tant qu'un niveau atteint `fanIn` : remets-le à zéro, multiplie la taille par `fanIn`, ajoute cette taille au total écrit, puis ajoute une SSTable au niveau suivant (crée-le s'il n'existe pas).

## Hint 3
`Segments` est la somme des `counts` à la fin. `MaxLevels` : multiplie une capacité par `branching` tant qu'elle reste inférieure à `n`.
