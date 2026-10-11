## Hint 1
Deux questions suffisent : T2 a-t-elle **écrit** ? Une transaction **concurrente** (validée après le début de T2) a-t-elle **validé** une écriture sur une donnée que T2 a lue ?

## Hint 2
Une transaction qui a abandonné ne compte pas ; une transaction validée **avant** le début de T2 non plus, son écriture est dans le snapshot de T2.

## Hint 3
Probabilité d'abandon d'une transaction de d secondes, avec un risque r par seconde : 1 − (1 − r)^d.
