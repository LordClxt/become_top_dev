## Hint 1
Un `[]` de partitions (une slice de `KV` par reducer) suffit pour le « shuffle ». Pour le tri, `sort.SliceStable` ; pour grouper, parcours la partition triée et avance tant que `GroupKey` ne change pas.

## Hint 2
Clé du profil : `id + "\x00" + "0"`. Clé d'un événement : `fmt.Sprintf("%s\x001%020d", id, at)` (`\x00` puis `1`). Le `"0"` passe avant le `"1"`, et le zéro-padding fait que l'ordre des chaînes suit l'ordre des nombres. `PartitionKey` et `GroupKey` coupent au `"\x00"` (`strings.Cut`). Préfixe aussi les valeurs (`"U"`, `"E"`) pour que le reducer sache ce qu'il lit.

## Hint 3
Dans `Reduce`, si la première valeur n'est pas un profil, il n'y a pas d'utilisateur : n'émets rien. Sinon, émets une ligne par valeur suivante. Après `Run`, aplatis les partitions, décode, puis `sort.SliceStable` par (UserID, At). Pour la jointure broadcast, `min(t*size, len(events))` borne chaque tranche ; ne produis jamais la sortie en itérant sur une map Go.
