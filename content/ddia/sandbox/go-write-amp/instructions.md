## Contexte

« LSM écrit plus vite » est une affirmation vague. Tu la remplaces par des chiffres : un modèle simple de l'amplification en écriture d'un B-tree, une simulation de compaction *size-tiered*, et le calcul de la profondeur d'un B-tree.

## À implémenter dans `amp.go`

- **`BTreeWriteAmp(recordSize, pageSize)`** : une mise à jour écrit l'enregistrement dans le WAL, puis la page entière : `(recordSize + pageSize) / recordSize`. `recordSize <= 0` : 0.
- **`MaxLevels(n, branching)`** : plus petit `L >= 1` tel que `branching^L >= n`. `branching < 2` : 0.
- **`CapacityBytes(levels, branching, pageSize)`** : `branching^levels × pageSize`. Pour 4 niveaux, 500 et 4 Ko : environ 256 To.
- **`SimulateSizeTiered(flushBytes, flushes, fanIn)`** : chaque flush écrit `flushBytes` octets (déjà écrits dans le WAL : compte-les deux fois). Dès qu'un niveau a `fanIn` SSTables, elles fusionnent en une SSTable du niveau suivant de taille égale à la somme ; la fusion écrit cette taille. La cascade continue. Renvoie `Result{UserBytes, TotalWritten, Segments, Amp}`.

## Exemple

16 flushes de 1 octet avec `fanIn = 4` : 16 (WAL) + 16 (flush) + 4×4 (fusions de niveau 0) + 16 (fusion de niveau 1) = 64 octets pour 16 utiles, soit une amplification de 4, et 1 segment restant.
