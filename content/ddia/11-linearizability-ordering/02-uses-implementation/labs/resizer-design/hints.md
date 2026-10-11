## Hint 1
La photo et la notification empruntent deux canaux différents : le worker doit lire là où une écriture terminée est forcément visible.

## Hint 2
Le pseudo est une contrainte d'unicité : il faut un compare-and-set linéarisable, que seul un système à consensus fournit de façon sûre.

## Hint 3
Chaîne : navigateur → serveur web (appel), serveur web → stockage (écriture) et → file (asynchrone), file → worker (asynchrone), worker → stockage (lecture) et → vignettes (écriture), serveur web → coordination (appel).
