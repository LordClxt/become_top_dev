## Hint 1
Promouvoir le plus avancé minimise les écritures perdues. Un seul leader doit exister.

## Hint 2
L'application ne connaît pas l'adresse du leader : elle passe par le routeur, que le détecteur de pannes reconfigure.

## Hint 3
L'ancien leader revient comme **follower** du nouveau : il reçoit une flèche de réplication et plus aucune écriture de l'application.
