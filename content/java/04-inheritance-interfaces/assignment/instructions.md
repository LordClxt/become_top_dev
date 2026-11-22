## Contexte

Le tampon des ordres en attente d'envoi ne doit jamais dépasser sa capacité : au-delà, la passerelle d'échange rejette tout le lot. `BoundedList` étend `ArrayList` et redéfinit `add(E)` et `addAll`. En production, le tampon a pourtant dépassé sa limite : un module insère avec `add(index, e)`, un autre avec un `ListIterator`, un troisième à travers une `subList`. Et quand Java a ajouté de nouvelles méthodes d'ajout à `List` (`addFirst`, `addLast` en Java 21), personne n'a pensé à la limite.

## Ta mission

Réécris `BoundedList` :
- `BoundedList.wrap(list, capacity)` **enveloppe** la liste reçue (n'importe quelle implémentation, sans la copier) ; une liste déjà trop longue est refusée (`IllegalArgumentException`) ;
- **aucun** chemin d'insertion ne peut dépasser la capacité : `add`, `add(index, e)`, `addAll`, `addAll(index, c)`, `listIterator().add`, `subList(...).add`, `Collections.addAll`… Au-delà : `IllegalStateException`, et la liste ne change pas ;
- `addAll` est tout ou rien : un lot qui ne tient pas est refusé entièrement ;
- retirer libère de la place ; `get`, `set`, `equals`, `hashCode` se comportent comme pour toute liste.

Le correcteur regarde aussi si ta solution résiste aux méthodes d'ajout **futures** de `List` (voir le barème). Ne modifie que `BoundedList.java`.
