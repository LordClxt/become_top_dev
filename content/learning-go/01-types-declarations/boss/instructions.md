## Contexte

Une sonde envoie ses mesures par radio. Chaque octet compte : l'en-tête d'un paquet tient sur **32 bits**, et une somme de contrôle sur **un seul octet** protège le tout. Tu écris le codeur et le décodeur, en maniant des bits, des tailles fixes et des conversions explicites. Une seule erreur de décalage et les champs se marchent dessus.

## Format

```
bits 31..29  Version (3 bits)       0 à 7
bits 28..24  Flags   (5 bits)       Urgent, Ack, Encrypted, Fragment, Last
bits 23..16  Length  (8 bits)       longueur de la charge utile, 0 à 255
bits 15..0   ID      (16 bits)
```

Un paquet complet : **en-tête (4 octets, octet de poids fort d'abord)**, puis la **charge utile**, puis **1 octet de somme de contrôle** calculé sur tout ce qui précède.

## Ta mission

Dans `packet.go` :

1. **Les drapeaux.** `Urgent`, `Ack`, `Encrypted`, `Fragment`, `Last` valent un bit chacun, dans cet ordre, en partant du bit de poids faible (`Urgent = 0b00001`, `Last = 0b10000`). Déclare-les avec `iota`. Implémente `Has` (tous les bits demandés sont présents), `With` (ajoute) et `Without` (retire, avec `&^`).
2. **`Header.Pack() (uint32, error)`** range l'en-tête dans un mot de 32 bits. Refuse avec `ErrField` une version supérieure à 7 ou des drapeaux qui dépassent 5 bits : sinon les bits déborderaient sur le champ voisin.
3. **`UnpackHeader(w uint32) Header`** fait l'inverse.
4. **`Checksum(data []byte) byte`** renvoie l'octet `c` tel que `(somme des octets + c) % 256 == 0`. La somme doit « faire le tour » sur un octet.
5. **`Encode(h Header, payload []byte) ([]byte, error)`** produit le paquet. Le champ `Length` de `h` est **ignoré** : il est calculé depuis la charge utile. Plus de 255 octets : `ErrPayload`.
6. **`Decode(packet []byte) (Header, []byte, error)`** vérifie et découpe un paquet : `ErrShort` (moins de 5 octets), `ErrChecksum` (somme invalide), `ErrLength` (la longueur annoncée ne correspond pas à la charge utile).

Exemple : `Header{Version: 5, Flags: Ack|Last, Length: 200, ID: 0xBEEF}` se range dans `0xB2C8BEEF`.

## Pièges

- `uint8(5) << 29` déborde : convertis en `uint32` **avant** de décaler.
- Un champ trop grand écrase silencieusement son voisin : valide avant d'assembler.
- Les erreurs doivent pouvoir se tester avec `errors.Is`.
