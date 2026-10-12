Tinybase doit tenir sur plusieurs nœuds. Dans `partitioning.go` :

1. **Jalon 1** : `HashPartition` (tranches contiguës de l'espace des hachages), `RangePartitioner` (`Locate`, `RangeQuery`) et le sel pour clés chaudes.
2. **Jalon 2** : mesurer ce que déplace `hash mod N`, puis `Assign`, `AddNode`, `RemoveNode` sur un nombre fixe de partitions.
3. **Jalon 3** : un index local et un index global (nombre de partitions touchées en écriture et en lecture), et un `Router` à table versionnée.

Commence par `go test ./... -run TestM1`.
