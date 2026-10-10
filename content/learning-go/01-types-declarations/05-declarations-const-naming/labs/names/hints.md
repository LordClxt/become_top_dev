## Hint 1
Sépare le travail en deux : `IsValidIdentifier` répond à « le compilateur accepte-t-il ce nom ? », `Lint` s'appuie dessus puis ajoute les règles de style.

## Hint 2
Parcours le nom avec `for i, r := range name` : `r` est une rune, `i` sa position. Le premier caractère doit être une lettre ou `_`, les suivants peuvent aussi être des chiffres. Pour les mots-clés, une `map[string]bool` est la structure naturelle.

## Hint 3
Dans `Lint`, traite d'abord `Invalid` (et ne renvoie que lui), puis le cas `"_"`. Un caractère est non ASCII quand `r > unicode.MaxASCII`. Pour distinguer `SnakeCase` de `ScreamingCase`, compare `strings.ToUpper(name)` à `name` : s'il n'y a aucune minuscule, les deux sont égaux.
