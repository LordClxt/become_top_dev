Tinybase passe en réplication **sans leader**. Dans `leaderless.go` :

1. **Jalon 1** : un vecteur de version (`VV`) avec `Compare`, `Inc`, `Merge` et `Sum` (un G-Counter est un vecteur qu'on fusionne par maximum).
2. **Jalon 2** : un `Store` qui implémente l'algorithme du panier (numéro de version par clé, valeurs concurrentes conservées) et `MergeCarts` (union avec tombstones).
3. **Jalon 3** : un `Cluster` à quorum (n, w, r) avec nœuds en panne, réparation à la lecture et anti-entropie.

Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `TestM1`, `TestM2` ou `TestM3` dans les résultats. Commence par faire passer les `TestM1`, les suivants peuvent échouer en attendant.
