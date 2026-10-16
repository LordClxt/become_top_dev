Tinybase doit maintenant offrir une isolation sérialisable. Dans `serializable.ts` :

1. **Jalon 1** : `Executor` (une file, une procédure à la fois, annulation en cas d'erreur) et `PartitionedExecutor`.
2. **Jalon 2** : `LockManager` : `acquire` (`'granted'`, `'waiting'`, `'deadlock'`), `releaseAll`, `holds`.
3. **Jalon 3** : `OptimisticDB` : instantané, lectures mémorisées, `scan` par préfixe, `commit` avec `SerializationError`.

JavaScript n'a qu'un seul fil d'exécution, mais une procédure `async` peut s'interrompre à chaque `await` : deux procédures peuvent donc s'entrelacer. L'`Executor` doit les enchaîner pour que la suivante ne démarre qu'à la fin de la précédente. Les tests le vérifient avec des procédures qui lisent, attendent un tour de boucle d'événements, puis écrivent.

Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `M1`, `M2` ou `M3` dans les résultats. Commence par faire passer les `M1`, les suivants peuvent échouer en attendant.
