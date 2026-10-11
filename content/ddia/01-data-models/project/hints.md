## Hint 1
Écris une méthode privée `upgrade(d Doc) (Doc, error)` qui copie le document puis applique les upgraders de sa version à la version courante. `Get`, `Find` et `Migrate` s'en servent toutes.

## Hint 2
Boucle `for v := version(d); v < c.CurrentVersion(); v++` : l'upgrader à appliquer est `c.upgraders[v-1]` ; après chaque pas, mets `d["_v"] = v+1`.

## Hint 3
Pour `lookup`, découpe le chemin avec `strings.Split(path, ".")` et descends dans les `map[string]any`. `Migrate` trie les identifiants avec `slices.Sorted(maps.Keys(c.docs))`.
