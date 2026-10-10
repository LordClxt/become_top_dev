## Hint 1
`msg[:n]` coupe après `n` bytes. Un `é` fait 2 bytes, un emoji 4 : la coupe tombe au milieu d'un caractère.

## Hint 2
Compte les caractères avec `utf8.RuneCountInString`. Pour couper, travaille sur des runes plutôt que sur des bytes.

## Hint 3
Convertis en `[]rune`, garde les `n` premières, puis reconvertis : `string(r[:n]) + "…"`.
