## Hint 1
Un paramètre variadique est une slice. Pour `MinMax`, traite d'abord la slice vide, puis initialise `lo` et `hi` avec le premier élément et parcours les autres.

## Hint 2
`Stats` : fais une copie de `vals` avant de la trier (`slices.Clone`). Pour la médiane, regarde la parité de la longueur : impair → l'élément du milieu, pair → la moyenne des deux éléments du milieu.

## Hint 3
`Join` : choisis le séparateur (`","` s'il est vide), calcule combien d'éléments tu omets, construis une slice de parties (chaque élément précédé de `Prefix`), ajoute le marqueur sans préfixe si besoin, puis `strings.Join`. N'oublie pas `strconv.Itoa` pour écrire N.
