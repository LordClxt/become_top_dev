## Hint 1
Un log est un tampon circulaire : sa durée de rétention, c'est la taille du disque divisée par le débit d'écriture.

## Hint 2
Dans un groupe, une partition n'est lue que par un consommateur à la fois : le parallélisme est plafonné par le nombre de partitions.

## Hint 3
Après un crash, on repart du dernier offset validé. Compte les messages de 86 000 à 87 499, bornes incluses.
