## Hint 1
Pour la pile : vérifie la taille **avant** de la décrémenter, puis, une fois l'élément récupéré, efface la case qu'il occupait. Pour `clear()`, efface les cases occupées avant de remettre `size` à zéro.

## Hint 2
`LinkedHashMap` sait déjà tout faire : son constructeur `(capacité, facteur de charge, accessOrder)` avec `accessOrder = true` range les entrées de la moins récemment **accédée** à la plus récente, et sa méthode protégée `removeEldestEntry` est appelée après chaque `put`. Il suffit de la redéfinir.

## Hint 3
`new LinkedHashMap<>(16, 0.75f, true) { @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > maxEntries; } }` (classe anonyme). Pour la regex : `private static final Pattern ROMAN = Pattern.compile("…");` puis `ROMAN.matcher(s).matches()`.
