## Hint 1
`JoinInts` : `strconv.AppendInt(dst, int64(n), 10)` écrit le nombre à la suite de `dst` et renvoie la slice mise à jour, sans allouer tant que la capacité suffit. Ajoute `sep` avec `append(dst, sep)` avant chaque nombre sauf le premier.

## Hint 2
`CountVowels` : une boucle `for _, r := range s` décode les runes sans rien allouer. Un `switch r` avec une longue liste de runes dans un seul `case` est lisible et rapide.

## Hint 3
`Dedupe` : garde deux indices, l'un qui lit, l'autre (`kept`) qui écrit la prochaine case à conserver. Un élément est conservé s'il est différent de la dernière valeur conservée (`xs[kept-1]`). Renvoie `xs[:kept]` : c'est une sous-slice, donc le même tableau.
