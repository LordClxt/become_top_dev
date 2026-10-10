## Hint 1
Une pile de `map[string]int` suffit. Au départ elle contient un seul bloc (le niveau le plus haut). `{` ajoute une map, `}` retire la dernière.

## Hint 2
Écris une petite fonction qui cherche un nom : elle parcourt la pile **de la fin vers le début** et renvoie la première map qui contient le nom. `print` et `NAME = INT` s'en servent. `var` et `:=`, eux, regardent seulement la **dernière** map.

## Hint 3
Pour reconnaître les instructions, découpe la ligne avec `strings.Fields` et utilise un `switch` sur sa forme : `{`, `}`, 4 champs commençant par `var`, 3 champs avec `:=` au milieu, 3 champs avec `=` au milieu, 2 champs commençant par `print`, sinon erreur de syntaxe. Garde aussi la liste des numéros de ligne des `{` ouverts pour l'erreur `missing }`.
