## Hint 1
Avec un consommateur par partition, le débit total est la somme des débits.

## Hint 2
Compare le nombre de lectures et le nombre d'écritures : chacune coûte 40 ms dans sa stratégie.

## Hint 3
Une reconstruction ne doit rien utiliser qui change entre deux rejeux : ni l'horloge du consommateur, ni l'état actuel d'un autre service.
