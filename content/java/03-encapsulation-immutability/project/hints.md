## Hint 1
M1 : `public record Trade(…) { public Trade { … } }`. Les accesseurs existants (`buyOrderId()`, …) sont exactement ceux qu'un record génère : les tests n'ont pas besoin de changer.

## Hint 2
M2 : ajoute un champ `filled` et un second constructeur privé `Order(Order o, long filled)` qui recopie tout le reste. Les composants sont immuables (`Money`, `String`, enums) : les partager est sans risque.

## Hint 3
M3 : parcours la `TreeSet` dans l'ordre de priorité ; les ordres de même prix y sont contigus, il suffit de fermer un niveau quand le prix change. Dans le constructeur compact de `BookSnapshot`, `levels = List.copyOf(levels);` **avant** de valider, pour valider ce que tu stockes vraiment.
