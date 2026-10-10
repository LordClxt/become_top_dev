## Hint 1
Un go.mod se lit ligne par ligne. Le premier mot de chaque ligne dit de quelle directive il s'agit : `module`, `go` ou `require`.

## Hint 2
Pour chaque ligne : coupe ce qui suit `//` (`strings.Index`), puis découpe en mots avec `strings.Fields`, qui ignore les espaces multiples. Une variable booléenne `inBlock` retient si tu es entre `require (` et `)`.

## Hint 3
Dans le bloc, chaque ligne non vide vaut `Require{Path: fields[0], Version: fields[1]}` ; `)` ferme le bloc. Hors bloc, `require chemin version` donne `fields[1]` et `fields[2]`. À la fin, si `Module` est vide, renvoie `ErrNoModule`.
