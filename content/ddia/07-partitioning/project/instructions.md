Tinybase doit tenir sur plusieurs nœuds. Dans `partitioning.ts` :

1. **Jalon 1** : `hashPartition` (tranches contiguës de l'espace des hachages), `RangePartitioner` (`locate`, `rangeQuery`) et le sel pour clés chaudes.
2. **Jalon 2** : mesurer ce que déplace `hash mod N`, puis `assign`, `addNode`, `removeNode` sur un nombre fixe de partitions. Une `Assignment` est une `Map` partition → nœud, en lecture seule : on en renvoie une nouvelle.
3. **Jalon 3** : un index local et un index global (nombre de partitions touchées en écriture et en lecture), et un `Router` à table versionnée.

`hash` est fournie (FNV-1a 32 bits + mélange) : elle donne le même résultat dans tous les processus, ce qu'on attend d'un hachage de partitionnement. Les hachages sont des entiers non signés de 32 bits ; `hash * parts` reste exact en JavaScript.

Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `M1`, `M2` ou `M3` dans les résultats. Commence par faire passer les `M1`, les suivants peuvent échouer en attendant.
