## Hint 1
Le client ne parle qu'à la couche de routage : aucune flèche directe du client vers un nœud.

## Hint 2
Les nœuds **écrivent** leur présence et leurs partitions dans ZooKeeper ; la couche de routage **lit** (et suit) l'affectation.

## Hint 3
Toutes les flèches qui entrent dans un nœud doivent venir de la couche de routage. Les flèches vers ZooKeeper partent des nœuds.
