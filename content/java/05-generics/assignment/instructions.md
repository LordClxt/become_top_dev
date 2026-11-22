## Contexte

Ordo remplace les exceptions de ses appels au réseau d'échange par un type `Result<T>` : une valeur, ou un message d'erreur, qu'on enchaîne avec `map` et `flatMap`. La première version est correcte… et presque inutilisable : `map` refuse une `Function<Object, String>` sur un `Result<Integer>`, `flatMap` refuse une fonction qui renvoie un `Result<Integer>` quand on attend un `Result<Number>`, `sequence` refuse une `List<Result<Integer>>` pour produire un `Result<List<Number>>`. Les équipes contournent avec des casts.

Les tests compilent de petits clients contre ta classe avec `-Xlint:all -Werror` : tous ces appels sûrs doivent compiler, sans cast.

## Ta mission

Change les signatures de `map`, `flatMap`, `orElseGet`, `ifOk` et `sequence` (et ce qu'il faut dans leurs corps) pour qu'elles acceptent tout ce qui est sûr, selon PECS. Aucun joker dans un type de retour, aucun cast non vérifié, aucun `@SuppressWarnings`. Le comportement ne change pas.

Ne modifie que `Result.java`. Le correcteur regarde aussi tes signatures et ta conception (voir le barème).
