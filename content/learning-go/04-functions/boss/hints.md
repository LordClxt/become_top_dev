## Hint 1
Commence par `tokenize`, qui transforme la chaîne en slice de jetons (un type avec un « genre » : nombre, nom, ou le caractère de l'opérateur). Parcours la chaîne avec un indice et un `switch` : espace, chiffre, lettre, opérateur, sinon `ErrSyntax`. Les nombres : chiffres, puis éventuellement `.` suivi d'au moins un chiffre.

## Hint 2
Une fonction par règle de la grammaire. `expression` appelle `terme` puis boucle tant que le jeton suivant est `+` ou `-`. `terme` fait de même avec `*` `/` et `unaire`. `unaire` regarde si le jeton est `-` (récursion) sinon appelle `puissance`. `puissance` lit un `primaire`, puis s'il y a `^`, un `unaire` comme exposant. Tu peux les écrire comme des closures qui partagent un indice `pos`, déclarées avec `var … func() (float64, error)` pour pouvoir s'appeler mutuellement.

## Hint 3
Pour `primaire` avec un nom suivi de `(` : lis les arguments en boucle (`expression`, puis `,` ou `)`), puis cherche la fonction dans la map et vérifie le nombre d'arguments **après** les avoir lus. Une puissance dont `math.Pow` renvoie `NaN` ou `±Inf` est une `ErrDomain`. Pour la division, teste `right == 0` avant de diviser. N'oublie pas de vérifier qu'il ne reste aucun jeton une fois l'expression terminée (`1 2` doit échouer).
