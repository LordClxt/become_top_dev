## Hint 1
Représente une SSTable comme une `[]entry` triée par clé ; la memtable peut être une simple `map[string]entry`, triée au moment du flush.

## Hint 2
`Get` : pour les segments, `sort.Search` trouve la première clé `>= key`. Incrémente `consulted` à chaque segment examiné.

## Hint 3
Pour `Scan` et `Compact`, construis d'abord la vue « dernière version de chaque clé » : parcours les segments du plus ancien au plus récent (puis la memtable) en écrasant dans une map, puis trie.
