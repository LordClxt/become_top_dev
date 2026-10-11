## Hint 1
Pour `Merge`, garde un `pos []int` (un curseur par segment). À chaque tour, la clé minimale parmi `segments[i][pos[i]]` est la prochaine clé de sortie.

## Hint 2
Parcours les segments dans l'ordre (ancien → récent) et garde la dernière entrée rencontrée pour la clé minimale : c'est la plus récente. Fais avancer le curseur de **chaque** segment qui portait cette clé.

## Hint 3
Pour `Lookup`, `sort.Search(len(idx), func(i int) bool { return idx[i].Key > key })` donne la première entrée d'index strictement plus grande ; la précédente est le point de départ (s'il n'y en a pas, la clé est absente).
