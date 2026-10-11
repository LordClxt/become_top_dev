## Contexte

Chercher une clé **absente** dans un LSM-tree oblige à lire tous les segments. Un filtre de Bloom en mémoire répond « sûrement absent » en quelques opérations. Tu l'implémentes et tu vérifies que son taux de faux positifs suit la théorie.

## À implémenter dans `bloom.go`

- **`NewBloom(m, k)`** : `m` bits (stockés dans des `uint64`), `k` hachages.
- **`Add(key)`** : positionne les `k` bits donnés par `positions(key, m, k)` (fournie, double hachage FNV).
- **`MayContain(key)`** : `false` si l'un des `k` bits vaut 0, sinon `true`. **Jamais de faux négatif.**
- **`FalsePositiveRate(m, k, n)`** : `(1 − e^(−k·n/m))^k`.
- **`OptimalK(m, n)`** : `(m/n)·ln 2` arrondi au plus proche, au minimum 1 (1 si `n == 0`).

## Ce que tu observes

Avec 10 bits par clé et `k = 7`, le taux de faux positifs est d'environ 0,8 %. Les tests le mesurent sur 20 000 clés absentes.
