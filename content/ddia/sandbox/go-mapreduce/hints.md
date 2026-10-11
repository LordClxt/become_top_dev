## Hint 1
Dans `MapReduce`, crée une `map[string][]V`. Le `emit` passé à `mapFn` est une fermeture qui ajoute la valeur à la slice de sa clé.

## Hint 2
Après avoir traité tous les documents, parcours la map des groupes et appelle `reduceFn(clé, valeurs)` une fois par entrée pour remplir la map de sortie.

## Hint 3
Le mois : `o.At.UTC().Format("2006-01")`. `MonthlyTotalsMR` filtre avec `Match` puis appelle `MapReduce` avec un `reduce` qui somme.
