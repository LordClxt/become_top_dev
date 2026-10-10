## Hint 1
Il faut regrouper par service : une map indexée par `Dept` est l'outil naturel.

## Hint 2
Une `map[string]DeptTotal` ne permet pas de modifier un champ directement (`m[k].Total += …` ne compile pas). Lis la valeur, modifie-la, puis réécris-la : `t := m[d]; t.Total += s; m[d] = t`.

## Hint 3
Une fois la map remplie, copie ses valeurs dans une slice réservée avec `make([]DeptTotal, 0, len(m))`, puis trie avec `slices.SortFunc(out, func(a, b DeptTotal) int { return strings.Compare(a.Dept, b.Dept) })`.
