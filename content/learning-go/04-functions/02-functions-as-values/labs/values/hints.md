## Hint 1
`Operators` : un littéral de map dont chaque valeur est une fonction anonyme `func(a, b int) (int, error) { … }`. Comme la fonction est dans un littéral, une nouvelle map est créée à chaque appel.

## Hint 2
`Eval` : `strings.Fields` découpe l'expression. Convertis les opérandes avec `strconv.Atoi`, puis cherche l'opérateur avec l'idiome *comma ok* : `op, ok := ops[symbol]`. Lire dans une map `nil` est permis et renvoie simplement `ok == false`.

## Hint 3
Pour que l'erreur d'un opérateur remonte inchangée, renvoie directement `op(a, b)`. Pour `Apply`, alloue la sortie avec `make([]int, len(xs))`. Pour `Filter`, une slice vide non nil (`[]int{}`) évite les surprises à l'appelant.
