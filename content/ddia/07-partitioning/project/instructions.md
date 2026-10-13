Tinybase doit tenir sur plusieurs nœuds. Dans `partitioning.go` :

1. **Jalon 1** : `HashPartition` (tranches contiguës de l'espace des hachages), `RangePartitioner` (`Locate`, `RangeQuery`) et le sel pour clés chaudes.
2. **Jalon 2** : mesurer ce que déplace `hash mod N`, puis `Assign`, `AddNode`, `RemoveNode` sur un nombre fixe de partitions.
3. **Jalon 3** : un index local et un index global (nombre de partitions touchées en écriture et en lecture), et un `Router` à table versionnée.

Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `TestM1`, `TestM2` ou `TestM3` dans les résultats. Commence par faire passer les `TestM1`, les suivants peuvent échouer en attendant.
