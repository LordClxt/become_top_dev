Tinybase doit maintenant offrir une isolation sérialisable. Dans `serializable.go` :

1. **Jalon 1** : `Executor` (une goroutine, une procédure à la fois, annulation en cas d'erreur) et `PartitionedExecutor`.
2. **Jalon 2** : `LockManager` : `Acquire` (accordé / en attente / interblocage), `ReleaseAll`, `Holds`.
3. **Jalon 3** : `OptimisticDB` : instantané, lectures mémorisées, `Scan` par préfixe, `Commit` avec `ErrSerialization`.

Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `TestM1`, `TestM2` ou `TestM3` dans les résultats. Commence par faire passer les `TestM1`, les suivants peuvent échouer en attendant.
