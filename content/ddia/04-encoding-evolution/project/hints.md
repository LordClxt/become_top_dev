## Hint 1
Zigzag en Go : `u := uint64(n<<1) ^ uint64(n>>63)`. Décodage : `int64(u>>1) ^ -int64(u&1)`.

## Hint 2
`PutVarint` : tant que `u >= 0x80`, ajoute `byte(u) | 0x80` puis `u >>= 7` ; ajoute enfin `byte(u)`. `ReadVarint` fait l'inverse en décalant chaque groupe de `7*i` bits.

## Hint 3
`Update` : décode, puis construis la nouvelle liste en une passe. Pour chaque champ lu : s'il n'est pas dans `set`, garde-le tel quel ; sinon écris le remplaçant la première fois et saute les occurrences suivantes. Ajoute à la fin les numéros de `set` jamais rencontrés, puis ré-encode.
