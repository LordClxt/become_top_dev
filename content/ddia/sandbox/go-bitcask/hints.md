## Hint 1
`Set` : `off := len(s.log)`, ajoute `encode(key, value, false)` au log, puis `s.index[key] = off`. `Get` appelle `decode(s.log, off)`.

## Hint 2
`Open` : boucle `for off < len(log)` ; appelle `decode` ; si `!ok`, `break`. Une pierre tombale fait `delete(s.index, key)`. À la fin, le log du Store est `slices.Clone(log[:off])` et le nombre d'octets ignorés vaut `len(log) - off`.

## Hint 3
`Compact` : trie les entrées de l'index par offset (`slices.SortFunc`) pour conserver l'ordre d'écriture, ré-encode chaque valeur dans un nouveau log, et remplace `s.log` et `s.index` d'un coup.
