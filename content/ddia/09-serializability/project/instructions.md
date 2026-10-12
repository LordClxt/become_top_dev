Tinybase doit maintenant offrir une isolation sérialisable. Dans `serializable.go` :

1. **Jalon 1** : `Executor` (une goroutine, une procédure à la fois, annulation en cas d'erreur) et `PartitionedExecutor`.
2. **Jalon 2** : `LockManager` : `Acquire` (accordé / en attente / interblocage), `ReleaseAll`, `Holds`.
3. **Jalon 3** : `OptimisticDB` : instantané, lectures mémorisées, `Scan` par préfixe, `Commit` avec `ErrSerialization`.

Commence par `go test ./... -run TestM1`.
