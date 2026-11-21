## Hint 1
Les options arrivent toutes dans `opts`, même si l'appelant les écrit après la liste. Commence par refuser les clés inconnues (`opts.keySet() - KEYS`), puis traite chaque option séparément.

## Hint 2
Une petite méthode `toInt(value, int fallback)` évite de répéter la conversion : un `Number` donne `intValue()`, une `String` qui passe `isInteger()` donne `toInteger()`, tout le reste donne `fallback`. Borne ensuite avec `Math.min`/`Math.max`.

## Hint 3
Pour le tri : vérifie la propriété sur le premier élément (`it instanceof Map ? it.containsKey(sort) : it.hasProperty(sort)`), trie une **copie** (`items.sort(false) { it[sort] }`), inverse si `desc`. La page est `sorted.drop(offset).take(max)`.
