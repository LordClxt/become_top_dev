## Hint 1
Une lecture qui chevauche l'écriture peut voir l'ancienne ou la nouvelle valeur. Une lecture qui commence après la fin de l'écriture ne voit que la nouvelle.

## Hint 2
Repère la lecture de C (entre 2 et 4) qui a vu 1 : toute lecture qui commence après t = 4 ne peut plus voir 0.

## Hint 3
Pour le compare-and-set : si deux cas attendent la même ancienne valeur, un seul peut réussir. Pour le registre retardé, compte jusqu'à quel instant une valeur obsolète reste permise après la réponse de l'écriture.
