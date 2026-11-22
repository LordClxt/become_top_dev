## Contexte

`RingBuffer<E>` garde les N derniers prix d'un titre. Il a été « rendu générique » avec un `E[]` interne et une méthode `snapshot()` qui renvoie un `E[]`. Premier client en recette : `String[] last = buffer.snapshot();` lève une `ClassCastException`, à une ligne qui ne contient aucun cast. Et le fichier compile avec deux avertissements unchecked que personne n'a regardés.

## Ta mission

1. `snapshot()` renvoie une `List<E>` : les éléments du plus ancien au plus récent, dans une copie indépendante du tampon. Un client peut en faire un tableau typé (`toArray(new String[0])`) sans erreur.
2. Le compilateur refuse un élément du mauvais type.
3. `RingBuffer.java` compile avec `-Xlint:all -Werror` : aucun avertissement, sauf ceux que tu as **prouvés** sûrs et supprimés sur la plus petite portée possible, avec un commentaire.

Ne modifie que `RingBuffer.java`.
