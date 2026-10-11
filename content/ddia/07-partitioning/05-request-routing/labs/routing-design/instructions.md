Dessine l'approche « couche de routage » (comme HBase ou Kafka historiquement) :

- le client n'envoie ses requêtes qu'à la couche de routage ;
- la couche de routage transmet chaque requête au nœud qui possède la partition (au moins trois nœuds) ;
- chaque nœud s'enregistre dans ZooKeeper, et la couche de routage s'abonne à l'affectation qu'il garde.
