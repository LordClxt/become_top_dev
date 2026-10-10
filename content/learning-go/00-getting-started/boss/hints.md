## Hint 1
Trois fonctions indépendantes (`checkGoMod`, `checkSyntax`, `checkVet`) qui renvoient chacune des `[]Finding`, puis `slices.SortStableFunc` avec `cmp.Compare` sur le fichier puis la ligne. Ton code du devoir (analyse d'un format) se réutilise presque tel quel.

## Hint 2
Versions : découpe sur `.` et compare morceau par morceau avec `strconv.Atoi` (un morceau absent vaut 0). Syntaxe : garde l'index de la dernière ligne de code non vide ; pour chaque nouvelle ligne de code, si `needsSemicolon(précédente)` et que la ligne commence par un token de la liste, c'est un Finding. Attention à `else` : `elseValue := 1` n'en est pas un.

## Hint 3
Pour vet, cherche `fmt.` avec `strings.Index` en avançant un curseur, lis le nom de la fonction, puis découpe les arguments avec un compteur de profondeur (`(`, `[`, `{` l'augmentent, `)`, `]`, `}` la diminuent) et un état « dans une string » pour ignorer les virgules et parenthèses des littéraux. La parenthèse fermante à profondeur 0 termine l'appel. `strconv.Unquote` transforme `"%s\n"` en vrai format, et échoue si l'argument n'est pas un littéral.
