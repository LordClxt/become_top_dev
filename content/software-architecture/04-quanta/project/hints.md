## Hint 1
Union-find encore : unis les extrémités de chaque lien qui compte, puis regroupe par racine en sautant les files.

## Hint 2
Pour les décalages, parcours seulement les liens `sync` ; l'ensemble des caractéristiques à comparer est l'union des clés de `needs` des deux côtés.

## Hint 3
Pour `settle`, garde l'instant `free` où le serveur se libère : une requête commence à `max(arrivée, free)`. En asynchrone, compte les débuts déjà planifiés qui sont strictement postérieurs à l'arrivée : ce sont les requêtes qui attendent.
