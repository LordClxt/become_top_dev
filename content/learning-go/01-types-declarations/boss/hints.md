## Hint 1
Commence par les drapeaux : `Urgent Flags = 1 << iota` puis la liste suit toute seule. `Has` compare `f & x` à `x`, `With` utilise `|`, `Without` utilise `&^`.

## Hint 2
Pour `Pack`, assemble `uint32(h.Version)<<29 | uint32(h.Flags)<<24 | uint32(h.Length)<<16 | uint32(h.ID)`. Pour `UnpackHeader`, décale vers la droite puis convertis : la conversion en `uint8` ou `uint16` garde les bits de poids faible, et c'est exactement ce qu'il faut pour `Length` et `ID`. Version et drapeaux demandent aussi un masque ou un décalage bien choisi.

## Hint 3
`Checksum` : additionne les octets dans une variable de type `byte` (elle fait le tour toute seule), puis renvoie son opposé : en non signé, `-sum` vaut `256 - sum`. Pour `Decode`, vérifie dans cet ordre : longueur minimale, somme de contrôle sur `packet[:len(packet)-1]`, puis cohérence de `Length`.
