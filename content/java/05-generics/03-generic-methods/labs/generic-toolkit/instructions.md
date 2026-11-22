## Contexte

`Collections2` regroupe quatre outils utilisés partout dans Ordo : `union`, `max`, `identity` et `invert`. Écrits avant les génériques, ils prennent et renvoient des types bruts : chaque appelant caste le résultat, `max` d'une liste d'objets non comparables plante à l'exécution, `identity()` crée un objet à chaque appel, et `invert` perd une clé en silence quand deux clés ont la même valeur.

Les tests compilent de petits clients contre ta classe, avec `-Xlint:all -Werror` : ils ne doivent avoir besoin d'aucun cast.

## Ta mission

1. Les quatre méthodes deviennent **génériques** : `union` de deux `Set<E>` donne un `Set<E>`, `max` d'une `Collection<E>` donne un `Optional<E>`, `identity()` un `UnaryOperator<T>`, `invert` d'une `Map<K, V>` une `Map<V, K>`.
2. `max` d'une collection d'éléments non comparables est refusé **à la compilation**.
3. `identity()` renvoie toujours le **même** objet.
4. `invert` lève `IllegalArgumentException` si deux clés ont la même valeur.
5. `Collections2.java` compile avec `-Xlint:all -Werror` (un avertissement prouvé sûr peut être supprimé au plus près, avec un commentaire).

Ne modifie que `Collections2.java`.
