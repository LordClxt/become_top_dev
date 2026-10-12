Relay accepte des jobs, en exécute plusieurs à la fois avec un nombre borné de workers, refuse ce qu'il ne peut pas absorber, et s'arrête proprement.

Dans `relay.go` :

1. **Jalon 1** : `New`, `Submit`, `Result` : des workers qui consomment une file.
2. **Jalon 2** : refus immédiat (`ErrFull`, `ErrDuplicate`) et `Stats`.
3. **Jalon 3** : `Shutdown(ctx)` : drainer, puis forcer l'arrêt si le délai expire.

Commence par `go test -race ./... -run TestM1`.
