## Contexte

Deux opérations font la force d'un LSM-tree : la **fusion** de segments triés (un mergesort) et la **recherche** avec un index creux. Tu écris les deux.

## À implémenter dans `sstable.go`

### `Merge(segments, dropTombstones)`
Fusionne des segments triés par clé. `segments[0]` est le **plus ancien**, le dernier le plus **récent** : pour une clé présente dans plusieurs segments, la version du plus récent **gagne**. Sortie triée, une entrée par clé, slice vide non nil s'il n'y a rien.
- `dropTombstones == false` : la pierre tombale gagnante est conservée (un segment plus ancien non fusionné pourrait encore contenir la clé).
- `dropTombstones == true` : les clés dont la version gagnante est une pierre tombale disparaissent. Une valeur **plus récente** qu'une pierre tombale la remplace.

Travaille comme un mergesort : avance un curseur par segment, prends la plus petite clé, ne relis pas tout.

### `BuildSparseIndex(entries, every)`
Une entrée d'index toutes les `every` entrées, en commençant par la première.

### `Lookup(entries, idx, key)`
Part de la dernière clé indexée `<= key` et balaie vers l'avant jusqu'à trouver la clé ou la dépasser. Renvoie l'entrée (**même une pierre tombale**), si elle existe, et le **nombre d'entrées examinées** : il ne doit jamais dépasser la taille d'un bloc.
