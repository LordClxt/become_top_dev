## Contexte

Tu assembles toutes les pièces de la leçon sur les LSM-trees : une **memtable**, des **SSTables** immuables, le chemin de lecture memtable → segments récents → anciens, les **pierres tombales**, un **scan** par intervalle, et la **compaction**. Tout est en mémoire ; la forme est celle de LevelDB.

## À implémenter dans `lsm.go`

- **`New(limit)`** : la memtable part en SSTable dès qu'elle contient `limit` **clés distinctes** (pierres tombales comprises). Mettre à jour une clé déjà en memtable ne compte pas.
- **`Put`, `Delete`** : `Delete` écrit une pierre tombale même si la clé est inconnue de la memtable (un segment plus ancien pourrait la contenir).
- **`Get`** : memtable d'abord, puis segments du plus récent au plus ancien, en s'arrêtant à la première occurrence. Une pierre tombale = absente. Mémorise le nombre de segments examinés (`SegmentsConsulted`).
- **`Scan(lo, hi)`** : paires vivantes triées dans `[lo, hi)`, la version la plus récente de chaque clé gagne, les pierres tombales masquent. `hi == ""` : sans borne haute.
- **`Compact`** : une seule SSTable à la fin, sans pierres tombales ni anciennes versions. La memtable n'est pas touchée.

## Ce que tu mesures

Avec 10 segments, chercher une clé absente en consulte 10 ; après `Compact`, 1. C'est exactement le coût de lecture que la compaction sert à réduire, et le travail qu'un filtre de Bloom éviterait.
