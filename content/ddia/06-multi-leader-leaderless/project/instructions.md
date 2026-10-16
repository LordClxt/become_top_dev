Tinybase passe en réplication **sans leader**. Dans `leaderless.ts` :

1. **Jalon 1** : un vecteur de version (`VV`) avec `compare`, `inc`, `merge` et `sum` (un G-Counter est un vecteur qu'on fusionne par maximum). `Order` est une union de chaînes (`'before' | 'after' | …`), pas un `enum`.
2. **Jalon 2** : un `Store` qui implémente l'algorithme du panier (numéro de version par clé, valeurs concurrentes conservées) et `mergeCarts` (union avec tombstones).
3. **Jalon 3** : un `Cluster` à quorum (n, w, r) avec nœuds en panne, réparation à la lecture et anti-entropie.

Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `M1`, `M2` ou `M3` dans les résultats. Commence par faire passer les `M1`, les suivants peuvent échouer en attendant.
