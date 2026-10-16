## Hint 1
Zigzag : `BigInt.asUintN(64, (n << 1n) ^ (n >> 63n))`. Décodage : `(u >> 1n) ^ -(u & 1n)`. Attention, on ne mélange pas `bigint` et `number` : convertis avec `BigInt(x)` et `Number(x)`.

## Hint 2
`putVarint` : tant que `u >= 0x80n`, pousse `Number(u & 0x7fn) | 0x80` puis `u >>= 7n` ; pousse enfin `Number(u)`. `readVarint` fait l'inverse en décalant chaque groupe de `BigInt(7 * i)` bits.

## Hint 3
`update` : décode, puis construis la nouvelle liste en une passe. Pour chaque champ lu : s'il n'est pas dans `set`, garde-le tel quel ; sinon écris le remplaçant la première fois et saute les occurrences suivantes. Ajoute à la fin les numéros de `set` jamais rencontrés, puis ré-encode.
