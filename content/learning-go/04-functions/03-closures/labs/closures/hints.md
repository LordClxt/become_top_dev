## Hint 1
`Counter` et `Memoize` : déclare la variable d'état (un entier, une map) **dans** la fonction extérieure, puis renvoie la closure qui la modifie. Elle survit tant que la closure existe.

## Hint 2
`Memoize` : `if r, ok := cache[n]; ok { return r }`. Ne teste pas `r != 0` : un résultat nul serait recalculé à chaque fois. Pour `Chain`, fais une copie de `fns` avant de la capturer (`slices.Clone`).

## Hint 3
`SortPeople` : `sort.SliceStable(people, func(i, j int) bool { return less(people[i], people[j]) })`. La closure passée à `SortStable` capture `people` et `less`. Pour `Chain`, la closure renvoyée boucle sur la copie et réaffecte `s = fn(s)` à chaque étape.
