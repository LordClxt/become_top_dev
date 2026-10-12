## Hint 1
`findAll(/\w+/)` sur une String renvoie la liste des morceaux qui correspondent. `countBy { it }` fait le comptage. `Map.sort { a, b -> … }` reçoit deux entrées et renvoie une **nouvelle** map triée. Pour trier sur deux critères : `b.value <=> a.value ?: a.key <=> b.key` (l'Elvis passe au second critère si le premier vaut 0).

## Hint 2
`groupBy { it[0].toUpperCase() }` donne une map initiale → liste. Pour trier chaque liste, `collectEntries { k, v -> [k, v.sort(false)] }`. L'argument `false` demande une copie.

## Hint 3
`collectEntries { [it[key], it] }` construit une map. Pour `flattenRanges` : `collectMany { it.toList() }` aplatit, `unique()` retire les doublons, `sort()` trie. Un range est une liste : `(5..3).toList()` vaut `[5, 4, 3]`.
