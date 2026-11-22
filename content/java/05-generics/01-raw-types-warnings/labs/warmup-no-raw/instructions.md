## Contexte

`Batch<E>` regroupe des éléments à envoyer ensemble. Sa déclaration est générique, mais l'intérieur date d'avant Java 5 : une liste brute, un `addAll` qui accepte n'importe quelle collection, un cast non vérifié. Résultat : `Batch<String>` accepte un lot d'entiers, et l'erreur éclate plus tard, ailleurs. Et le fichier produit neuf avertissements que plus personne ne lit.

Les tests compilent ton fichier avec `-Xlint:rawtypes,unchecked -Werror`, et compilent de petits clients contre ta classe.

## Ta mission

1. Plus aucun type brut ni avertissement unchecked dans `Batch.java`, **sans** `@SuppressWarnings`.
2. `Batch<String>.addAll(List.of(42))` doit être refusé **à la compilation**.
3. Un `Batch<Number>` accepte une `List<Integer>`.

Ne modifie que `Batch.java`.
