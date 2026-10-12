Tinybase doit maintenant survivre à un réseau et à des horloges qui mentent. Dans `trouble.go` :

1. **Jalon 1** : `TimeoutBound` et `FailureDetector` (`Heartbeat`, `Timeout`, `Suspected`) : timeout adaptatif, fenêtre glissante, minimum.
2. **Jalon 2** : `Lamport`, `NewerLWW`, `Interval` (`Before`, `Overlaps`), `TrueTime` (`Now`, `After`) et `CommitWait`.
3. **Jalon 3** : `LockService` (baux et jetons), `FencedStorage`, `Majority`, `DeclaredDead`, `CheckFencing`.

Les temps sont des entiers en millisecondes fournis par l'appelant : ton code ne lit jamais l'horloge système, ce qui rend les tests déterministes.
Commence par `go test ./... -run TestM1`.
