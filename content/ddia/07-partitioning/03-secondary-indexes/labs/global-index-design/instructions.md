Le site d'annonces de voitures reçoit des recherches par couleur bien plus souvent que des nouvelles annonces. Dessine un **index secondaire global, partitionné par terme** :

- le service annonces écrit dans les partitions de données (au moins deux) ;
- les partitions de données propagent les changements vers les partitions de l'index global (au moins deux), de façon asynchrone ;
- le service recherche lit la partition d'index du terme, puis les documents trouvés.

Pas de scatter/gather, pas d'index sur une seule machine.
