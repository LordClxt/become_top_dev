## Hint 1
Horodatage = instant réel + avance de l'horloge du nœud (une avance négative est un retard).

## Hint 2
200 ppm, c'est 200 µs de dérive par seconde écoulée. La fenêtre de perte se termine quand l'horloge du nœud 3 dépasse l'horodatage de l'ancienne écriture.

## Hint 3
Un ordre n'est certain que si les intervalles sont disjoints. Spanner attend la largeur totale de l'intervalle, de l'au plus tôt à l'au plus tard.
