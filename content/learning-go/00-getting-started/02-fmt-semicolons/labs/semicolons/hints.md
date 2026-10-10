## Hint 1
Il n'y a que deux étapes : enlever le commentaire de fin de ligne, puis regarder le **dernier token**. Seul ce dernier token décide.

## Hint 2
Pour le commentaire, parcours la ligne caractère par caractère en retenant si tu es dans une string (`"`, `` ` ``) ou une rune (`'`) : un `//` ne compte qu'en dehors. Ensuite, retire les espaces de fin (`strings.TrimRight`) et regarde la fin : `++`/`--`, un caractère de `)]}"'` et `` ` ``, ou bien un mot.

## Hint 3
Si la ligne finit par une lettre, un chiffre ou `_`, remonte jusqu'au début du mot. Si c'est un mot-clé de Go, seul `break`, `continue`, `fallthrough` ou `return` donne `true`. Sinon c'est un identifiant ou un nombre : `true`. Une map de mots-clés rend ça très lisible.
