## Hint 1
Commence par l'interface et l'annotation de `states`. Dès que TypeScript connaît ton intention, l'erreur n'est plus sur `capital` mais sur la ligne qui contient `capitol`.

## Hint 2
`capitals` est un `map` ; `byCapital` un `find`. Le type de retour de `byCapital` est `State | undefined` : c'est ce que renvoie `find` quand rien ne correspond.

## Hint 3
Pour ignorer la casse, compare `state.capital.toLowerCase()` à `capital.toLowerCase()`. Type `list` en `readonly State[]` : la fonction ne modifie pas la liste, et ça accepte aussi les tableaux ordinaires.
