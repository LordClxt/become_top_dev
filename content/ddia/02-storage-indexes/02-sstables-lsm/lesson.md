---
id: ddia-ch02-l02
title: "SSTables et LSM-trees"
source: { chapter: 3, pages: "76-79" }
duration_min: 40
concepts:
  - id: ddia-sstable
    label: "SSTable : segment trié par clé, une seule entrée par clé"
  - id: ddia-merge-sorted
    label: "Fusion de segments triés à la mergesort : le plus récent gagne"
  - id: ddia-sparse-index
    label: "Index creux : une clé tous les quelques Ko suffit"
  - id: ddia-memtable-wal
    label: "Memtable en mémoire plus WAL sur disque pour ne pas perdre les écritures récentes"
  - id: ddia-lsm-tree
    label: "LSM-tree : cascade de SSTables fusionnées en arrière-plan"
  - id: ddia-bloom-filter
    label: "Filtre de Bloom : dire qu'une clé est sûrement absente pour éviter des lectures"
  - id: ddia-compaction-strategies
    label: "Compaction size-tiered contre leveled"
glossary:
  - term: "SSTable (Sorted String Table)"
    definition: "Segment dont les paires clé-valeur sont triées par clé, chaque clé apparaissant une seule fois."
  - term: "memtable"
    definition: "Structure triée en mémoire (arbre équilibré) qui reçoit les écritures avant leur écriture sur disque en SSTable."
  - term: "WAL (write-ahead log)"
    definition: "Journal où chaque écriture est ajoutée avant d'être appliquée ; il ne sert qu'à restaurer la memtable après un crash."
  - term: "LSM-tree (Log-Structured Merge-Tree)"
    definition: "Moteur de stockage fondé sur la fusion et la compaction de fichiers triés (LevelDB, RocksDB, Cassandra, HBase)."
  - term: "filtre de Bloom"
    definition: "Structure compacte qui approxime un ensemble : elle peut affirmer « absent » avec certitude, mais « présent » seulement avec une probabilité."
  - term: "compaction size-tiered / leveled"
    definition: "Size-tiered : les SSTables récentes et petites sont fusionnées dans de plus anciennes et grosses. Leveled : l'espace de clés est découpé en petites SSTables rangées par niveaux."
visuals: []
labs: [ddia-ch02-l02-lab-sstable-design, ddia-ch02-l02-lab-bloom-design]
xp: 40
---

## Pourquoi c'est important

L'index de hachage de la leçon précédente a deux limites : toutes les clés doivent tenir en mémoire, et les intervalles sont impossibles. Un seul changement de format les lève : **trier les segments par clé**. Cette idée simple est le cœur de LevelDB, RocksDB, Cassandra, HBase et de l'index de Lucene. Tu vas comprendre pourquoi leur écriture est si rapide.

## SSTable : un segment trié

Un segment de log contient des paires dans l'ordre d'écriture. Maintenant, on exige qu'elles soient **triées par clé**, et que chaque clé n'apparaisse **qu'une fois** par segment fusionné (la compaction y veille). C'est une **Sorted String Table**, ou **SSTable**. Trois avantages :

1. **La fusion est simple et efficace**, même pour des fichiers plus gros que la mémoire. Comme dans un *mergesort* : on lit les fichiers côte à côte, on regarde la première clé de chacun, on copie la plus petite dans le fichier de sortie, et on recommence. Si une clé apparaît dans plusieurs segments, on garde la valeur du segment le plus **récent** (les segments adjacents couvrent des périodes successives).
2. **Plus besoin d'indexer toutes les clés en mémoire.** Pour trouver `handiwork`, tu connais les offsets de `handbag` et `handsome` ; comme tout est trié, `handiwork` est entre les deux : saute à `handbag` et balaie. L'index peut donc être **creux** (*sparse*) : une clé tous les quelques Ko suffit, car quelques Ko se balaient très vite.
3. **Compression par blocs.** Puisque la lecture balaie de toute façon plusieurs paires, on peut les regrouper en un **bloc** compressé avant écriture. L'entrée de l'index creux pointe vers le début d'un bloc compressé : moins d'espace disque et moins de bande passante.

## Construire une SSTable : memtable et WAL

Comment obtenir des données triées alors que les écritures arrivent dans le désordre ? Maintenir un ordre trié **en mémoire** est facile (arbre rouge-noir, AVL). Le moteur fonctionne ainsi :

- une écriture va dans un arbre équilibré en mémoire, la **memtable** ;
- quand la memtable dépasse un seuil (quelques Mo), on l'écrit sur disque en **SSTable**, déjà triée : c'est le nouveau segment le plus récent. Pendant ce temps, les écritures continuent dans une nouvelle memtable ;
- pour lire : memtable d'abord, puis le segment le plus récent, puis le suivant, etc. ;
- de temps en temps, la fusion et la compaction tournent en arrière-plan.

Un seul problème : au crash, les écritures récentes (en memtable, pas encore sur disque) sont perdues. On garde donc un **journal séparé** (le **WAL**), où chaque écriture est ajoutée immédiatement. Son ordre n'importe pas : il sert seulement à **restaurer la memtable**. Quand la memtable est écrite en SSTable, le journal correspondant est jeté.

## LSM-tree

Ce principe est décrit par O'Neil et al. sous le nom de **Log-Structured Merge-Tree**. Les moteurs qui fusionnent et compactent des fichiers triés s'appellent des **moteurs LSM**. LevelDB et RocksDB sont des bibliothèques embarquables ; Cassandra et HBase, inspirés du papier Bigtable (qui a introduit *SSTable* et *memtable*), fonctionnent de même. **Lucene** (Elasticsearch, Solr) range son dictionnaire de termes de façon semblable : la clé est un mot, la valeur est la liste des identifiants de documents qui le contiennent (la *postings list*).

### Optimisations

- **Clés absentes.** Chercher une clé qui n'existe pas oblige à consulter la memtable puis tous les segments jusqu'au plus ancien. Un **filtre de Bloom** résout cela : structure compacte qui approxime un ensemble. Il peut dire avec certitude qu'une clé **n'est pas** là (zéro faux négatif), et il peut se tromper dans l'autre sens (faux positifs), ce qui économise beaucoup de lectures inutiles.
- **Stratégies de compaction.** *Size-tiered* : les SSTables récentes et petites sont fusionnées dans de plus anciennes et plus grosses (HBase ; Cassandra aussi). *Leveled* : l'espace de clés est découpé en petites SSTables et les données plus anciennes passent à des **niveaux** distincts, ce qui rend la compaction plus incrémentale et économe en espace (LevelDB, RocksDB, Cassandra aussi).

L'idée de base reste simple : une **cascade de SSTables fusionnées en arrière-plan**. Elle marche même quand les données dépassent de loin la mémoire, permet des **requêtes par intervalle** efficaces (les clés sont triées), et supporte un débit d'écriture remarquable car les écritures disque sont séquentielles.

## Au-delà du livre

Le filtre de Bloom se règle avec deux nombres : `m` bits et `k` fonctions de hachage. Pour `n` clés, le taux de faux positifs vaut environ `(1 − e^(−kn/m))^k`, et il est minimal pour `k ≈ (m/n)·ln 2`. Avec ~10 bits par clé on tombe sous 1 % de faux positifs. Tu le mesureras dans le TP.

## Pièges fréquents

- **Oublier le journal (WAL)** : sans lui, les dernières écritures disparaissent au crash.
- **Fusionner des segments non adjacents** : l'ordre de récence ne garantit plus que « le plus récent gagne ».
- **Croire qu'un filtre de Bloom peut avoir des faux négatifs** : jamais. Seuls les faux positifs existent.
- **Supprimer une pierre tombale trop tôt** : tant qu'un segment plus ancien contient la clé, la pierre tombale doit survivre à la fusion.

## À retenir

- SSTable = segment trié, une entrée par clé ; la fusion est un mergesort où le plus récent gagne.
- Un index creux suffit grâce au tri.
- Écriture : memtable + WAL ; flush en SSTable au seuil ; lecture : memtable puis segments du plus récent au plus ancien.
- Filtre de Bloom : « absent » est certain, « présent » est probable.
- Compaction size-tiered ou leveled : deux compromis différents entre écriture, lecture et espace.
