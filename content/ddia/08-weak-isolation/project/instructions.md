Tinybase doit désormais garantir des transactions. Dans `mvcc.ts` :

1. **Jalon 1** : `begin`, `get`, `put`, `delete`, `commit`, `abort` en read committed (pas de lecture sale ni d'écriture sale). Les erreurs sont des exceptions : `LockedError`, `ConflictError`, `FinishedError`.
2. **Jalon 2** : les règles de visibilité (`takeSnapshot`, `txVisible`, `visibleVersion`) pour l'isolation par instantané (`'snapshot'`), et `vacuum`.
3. **Jalon 3** : `hasConcurrentCommit` (détection de la mise à jour perdue), `lock` et `compareAndSet`.

Le niveau d'isolation est une union de chaînes : `'read-committed' | 'snapshot'`. Les tests rejouent des entrelacements précis de transactions, en un seul fil d'exécution : aucune concurrence réelle, donc rien à verrouiller côté JavaScript — les « verrous » du moteur sont ceux du modèle. Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `M1`, `M2` ou `M3` dans les résultats. Commence par faire passer les `M1`.
