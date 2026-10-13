Tinybase doit désormais garantir des transactions. Dans `mvcc.go` :

1. **Jalon 1** : `Begin`, `Get`, `Put`, `Delete`, `Commit`, `Abort` en read committed (pas de lecture sale ni d'écriture sale).
2. **Jalon 2** : les règles de visibilité (`takeSnapshot`, `txVisible`, `visibleVersion`) pour l'isolation par instantané, et `Vacuum`.
3. **Jalon 3** : `hasConcurrentCommit` (détection de la mise à jour perdue), `Lock` et `CompareAndSet`.

Les tests rejouent des entrelacements précis de transactions, sans goroutines. Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `TestM1`, `TestM2` ou `TestM3` dans les résultats. Commence par faire passer les `TestM1`, les suivants peuvent échouer en attendant.
