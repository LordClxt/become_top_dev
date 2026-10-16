Tinybase doit maintenant survivre à un réseau et à des horloges qui mentent. Dans `trouble.ts` :

1. **Jalon 1** : `timeoutBound` et `FailureDetector` (`heartbeat`, `timeout`, `suspected`) : timeout adaptatif, fenêtre glissante, minimum.
2. **Jalon 2** : `Lamport`, `newerLWW`, `Interval` (`before`, `overlaps`), `TrueTime` (`now`, `after`) et `commitWait`.
3. **Jalon 3** : `LockService` (baux et jetons ; `acquire` renvoie le jeton ou `undefined`), `FencedStorage` (lève `StaleTokenError`), `majority`, `declaredDead`, `checkFencing` (lève une erreur si la suite est invalide).

Les temps sont des entiers en millisecondes fournis par l'appelant : ton code ne lit jamais `Date.now()`, ce qui rend les tests déterministes.
Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `M1`, `M2` ou `M3` dans les résultats. Commence par faire passer les `M1`, les suivants peuvent échouer en attendant.
