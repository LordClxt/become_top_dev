Dessine le cluster d'une plateforme qui doit grandir sans interruption :

- **trois nœuds au moins**, chacun une zone qui contient des partitions ;
- un **nombre fixe de partitions**, plus grand que le nombre de nœuds (au moins 4 leaders), chacune répliquée sur un autre nœud ;
- un client qui passe par une **couche de routage**, elle-même abonnée à **ZooKeeper** ;
- un **rééquilibreur validé par un humain** qui publie l'affectation dans ZooKeeper ;
- un **index secondaire global**, partitionné par terme et mis à jour de façon asynchrone, lu par le service de recherche.

Méfie-toi des raccourcis de la palette.
