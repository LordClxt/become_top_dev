**La bibliothèque unique redéploie tout, à chaque fois.** Avec des bibliothèques fédérées, un changement de `rules` ne touche que 3 services, un changement de `status_events` 2. Seules les tables **communes** gardent un impact global, d'où la règle : les verrouiller, et réserver leurs modifications à l'équipe base de données.

Le partitionnement logique se fait aussi fin que possible, tant que les domaines de données restent bien définis : c'est lui qui transforme une base partagée en un risque maîtrisé.
