## Hint 1
Pour le nombre de nœuds : volume × facteur de réplication, divisé par la capacité d'un nœud, arrondi au-dessus.

## Hint 2
Une requête scatter/gather est lente dès qu'une seule partition l'est : calcule la probabilité qu'**aucune** ne le soit, puis prends le complément.

## Hint 3
Avec hash mod N de 9 à 10 nœuds, seules les clés dont le reste est identique restent : regarde `h mod 90`.
