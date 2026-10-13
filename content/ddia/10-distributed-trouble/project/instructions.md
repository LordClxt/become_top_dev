Tinybase doit maintenant survivre à un réseau et à des horloges qui mentent. Dans `trouble.go` :

1. **Jalon 1** : `TimeoutBound` et `FailureDetector` (`Heartbeat`, `Timeout`, `Suspected`) : timeout adaptatif, fenêtre glissante, minimum.
2. **Jalon 2** : `Lamport`, `NewerLWW`, `Interval` (`Before`, `Overlaps`), `TrueTime` (`Now`, `After`) et `CommitWait`.
3. **Jalon 3** : `LockService` (baux et jetons), `FencedStorage`, `Majority`, `DeclaredDead`, `CheckFencing`.

Les temps sont des entiers en millisecondes fournis par l'appelant : ton code ne lit jamais l'horloge système, ce qui rend les tests déterministes.
Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `TestM1`, `TestM2` ou `TestM3` dans les résultats. Commence par faire passer les `TestM1`, les suivants peuvent échouer en attendant.
