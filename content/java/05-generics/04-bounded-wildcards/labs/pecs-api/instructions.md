## Contexte

Les équipes d'Ordo se plaignent de `Stack<E>` et de `Pick` : une `Stack<Number>` refuse une `List<Integer>`, on ne peut pas vider une pile dans une `Collection<Object>`, `Pick.max` refuse une liste de `LocalDate`, et l'union d'un `Set<Integer>` et d'un `Set<Double>` ne donne pas de `Set<Number>`. Certains ont fini par écrire des types bruts pour « que ça passe ».

Les tests compilent de petits clients contre ton code, avec `-Xlint:all -Werror` : les appels sûrs doivent compiler sans cast, les appels dangereux doivent être refusés.

## Ta mission

Change **seulement les signatures** (les corps ne bougent presque pas) pour que :
1. `pushAll` accepte un `Iterable` de n'importe quel sous-type de `E` ;
2. `popAll` accepte une `Collection` de n'importe quel super-type de `E` ;
3. `Pick.max` accepte une liste de `LocalDate` (qui implémente `Comparable<ChronoLocalDate>`), et renvoie un `LocalDate` ;
4. `Pick.union` d'un `Set<Integer>` et d'un `Set<Double>` donne un `Set<Number>` ;
5. les appels qui casseraient les types (verser des `Number` dans une `List<Integer>`, empiler des `Number` dans une `Stack<Integer>`) restent refusés.

Fichiers modifiables : `Stack.java` et `Pick.java`.
