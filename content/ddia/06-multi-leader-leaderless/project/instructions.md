Tinybase passe en réplication **sans leader**. Dans `leaderless.go` :

1. **Jalon 1** : un vecteur de version (`VV`) avec `Compare`, `Inc`, `Merge` et `Sum` (un G-Counter est un vecteur qu'on fusionne par maximum).
2. **Jalon 2** : un `Store` qui implémente l'algorithme du panier (numéro de version par clé, valeurs concurrentes conservées) et `MergeCarts` (union avec tombstones).
3. **Jalon 3** : un `Cluster` à quorum (n, w, r) avec nœuds en panne, réparation à la lecture et anti-entropie.

Commence par `go test ./... -run TestM1`.
