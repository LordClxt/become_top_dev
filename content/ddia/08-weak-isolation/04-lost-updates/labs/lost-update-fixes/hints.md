## Hint 1
Quand deux cycles lisent la même valeur, un seul des deux incréments survit.

## Hint 2
Si le calcul s'écrit en SQL, l'opération atomique gagne. S'il est complexe, verrou explicite. Sans transactions, compare-and-set. Avec plusieurs réplicas qui acceptent des écritures, il faut fusionner.

## Hint 3
Compare-and-set : au tour k, il reste 11 − k clients, qui tentent tous leur UPDATE ; un seul réussit.
