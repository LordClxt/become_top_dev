## Hint 1
`Compare` : regarde si un compteur de `a` dépasse celui de `b`, et si un compteur de `b` dépasse celui de `a`. Les deux → concurrents. Aucun → égaux.

## Hint 2
`Put` : incrémente d'abord la version de la clé, puis ne garde que les valeurs dont la version est **strictement supérieure** à celle reçue, avant d'ajouter la nouvelle.

## Hint 3
`Cluster.Write` écrit sur tous les nœuds en marche, puis compte les confirmations : une écriture sous le quorum renvoie `ErrQuorum` mais les copies déjà écrites restent.

## Hint 4
`Cluster.Read` : ignore les nœuds en panne dans la liste, exige au moins `R` réponses, prends la plus haute version et réécris-la sur les nœuds consultés.
