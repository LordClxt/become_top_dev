## Hint 1
Le leader n'attend que les followers **synchrones** : la latence d'écriture vaut l'écriture locale plus l'aller-retour du plus lent d'entre eux.

## Hint 2
Si chaque follower est absent 2 % du temps, indépendamment, la probabilité qu'**aucun** des trois ne soit absent est 0,98³. En semi-synchrone restreint à A et C, on ne bloque que si **les deux** sont absents en même temps.

## Hint 3
Écritures perdues = débit d'écriture × retard du follower le plus avancé au moment de la panne.
