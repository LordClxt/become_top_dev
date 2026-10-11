## Hint 1
Le seul thread est occupé du début à la fin de la transaction, attente réseau comprise.

## Hint 2
Transaction interactive : 3 allers-retours de 0,8 ms plus 40 µs de travail. Débit = 1 / durée d'occupation.

## Hint 3
Avec une procédure stockée, l'aller-retour de l'appel a lieu avant et après l'exécution : le thread ne travaille que les 40 µs.
