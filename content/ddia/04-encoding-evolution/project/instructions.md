## Contexte

Pendant une mise à jour progressive de Tinybase, des nœuds anciens et nouveaux s'échangent des enregistrements. Tu écris le codec qui rend cela possible : des champs identifiés par un **numéro** (pas par un nom), des entiers de **longueur variable**, et une mise à jour qui **conserve ce que l'ancien code ne connaît pas**. Les types, constantes et erreurs sont fournis.

## Jalon 1 — L'entier de longueur variable
`PutVarint(n)` : on applique le **zigzag** (`u = (n << 1) XOR (n >> 63)`, sur `uint64`) pour que −1, 1, −2… restent courts, puis on découpe en groupes de **7 bits**, **poids faible d'abord**, le bit de poids fort de chaque octet valant 1 s'il en reste. Exemples : `0 → 00`, `−1 → 01`, `64 → 80 01`, `1337 → f2 14`.
`ReadVarint(b)` renvoie la valeur et le nombre d'octets lus ; tronqué : `ErrTruncated` ; plus de 10 octets : erreur.

## Jalon 2 — Encoder un enregistrement
Un champ s'écrit : **un octet d'en-tête** `(numéro << 3) | type`, puis sa valeur. `KindVarint` : un entier via `PutVarint`. `KindString` : la longueur via `PutVarint`, puis les octets. Les numéros valent de 1 à 15 (`ErrBadTag` sinon), un type inconnu donne `ErrBadKind`. `DecodeRecord` relit tout, **dans l'ordre**, y compris un numéro répété ; sans octets, il renvoie une slice vide **non nil** ; octets manquants : `ErrTruncated`.

## Jalon 3 — Évoluer sans rien casser
- `Read(rec, known)` : se comporte comme un **ancien code** qui ne connaît que les numéros de `known`. Il renvoie pour chacun le **dernier** champ rencontré, et saute tout le reste.
- `Update(rec, known, set)` : remplace la 1ʳᵉ occurrence de chaque numéro de `set`, supprime les occurrences suivantes, ajoute à la fin ceux qui manquent, et **conserve tel quel, dans l'ordre**, tout champ de numéro hors de `known`. Un `set` portant un numéro hors de `known` est une erreur. Ni `rec` ni `set` ne sont modifiés.

## Exemple
Un enregistrement écrit par la version 2 porte les numéros 1, 2 et 3. Le code de la version 1 ne connaît que 1 et 2 : il met à jour le champ 2, et le champ 3 **doit** survivre à la réécriture.
