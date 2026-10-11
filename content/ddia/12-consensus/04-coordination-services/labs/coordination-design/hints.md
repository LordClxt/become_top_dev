## Hint 1
Les nœuds ZooKeeper vivent dans une zone et se répliquent entre eux. Combien en faut-il pour tolérer une panne, sans en mettre un inutile ?

## Hint 2
Chaque nœud de stockage écrit son nœud éphémère ; le rééquilibreur surveille cette liste et réécrit l'attribution par compare-and-set.

## Hint 3
Le routeur lit l'attribution dans ZooKeeper, puis envoie les requêtes aux nœuds de stockage. Le client ne parle qu'au routeur.
