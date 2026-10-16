## Hint 1
`compare` : regarde si un compteur de `a` dépasse celui de `b`, et si un compteur de `b` dépasse celui de `a` (`Object.entries`, compteur absent : `?? 0`). Les deux → concurrents. Aucun → égaux.

## Hint 2
`put` : incrémente d'abord la version de la clé, puis ne garde que les valeurs dont la version est **strictement supérieure** à celle reçue, avant d'ajouter la nouvelle.

## Hint 3
`Cluster.write` écrit sur tous les nœuds en marche, puis compte les confirmations : une écriture sous le quorum lève `QuorumError`, mais les copies déjà écrites restent.

## Hint 4
`Cluster.read` : ignore les nœuds en panne de la liste, exige au moins `r` réponses, prends la plus haute version et réécris-la sur les nœuds consultés.
