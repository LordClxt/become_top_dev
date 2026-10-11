## Hint 1
Pose d'abord trois zones « Nœud », puis répartis-y au moins quatre leaders et leurs réplicas : un réplica jamais sur le nœud de son leader.

## Hint 2
Toutes les flèches qui entrent dans un leader viennent de la couche de routage. Le service de recherche lit l'index, puis passe lui aussi par la couche de routage pour lire les annonces.

## Hint 3
ZooKeeper reçoit l'affectation du rééquilibreur (écriture) et la couche de routage la lit. Les leaders propagent vers l'index global en asynchrone ; les leaders répliquent vers leurs réplicas.
