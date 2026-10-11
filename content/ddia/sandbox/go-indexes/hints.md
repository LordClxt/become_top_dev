## Hint 1
`Secondary` : une `map[string][]int` ; `slices.BinarySearch` te donne l'indice d'insertion dans la liste triée et dit si l'identifiant y est déjà.

## Hint 2
`Concat` : chaque entrée est `(clé, id)` avec `clé = col1 + "\x00" + col2 + "\x00" …`. Garde `entries` triée en insérant à la bonne place (`sort.Search` + `slices.Insert`).

## Hint 3
`Lookup(prefix...)` : construis la clé du préfixe de la même façon, trouve le premier `entries[i].key >= p` avec `sort.Search`, puis avance tant que `strings.HasPrefix(entries[i].key, p)`.
