## Hint 1
Écris une petite fonction qui lit une clé chaîne dans la `map[string]any` et distingue « absente » de « présente mais pas une chaîne » (assertion de type avec `, ok`).

## Hint 2
`strings.Cut(name, " ")` coupe au premier espace ; pense à `strings.TrimSpace` avant et sur le reste.

## Hint 3
`Migrate` peut simplement appeler `ReadUser` sur chaque document qui n'a pas `first_name`, puis écrire les deux champs et `delete(doc, "name")`.
