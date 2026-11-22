## Hint 1
Une méthode générique déclare ses paramètres de type avant son type de retour : `public static <E> Set<E> union(Set<E> s1, Set<E> s2)`. Le compilateur déduit `E` chez l'appelant.

## Hint 2
Pour `max`, il faut des éléments comparables **à eux-mêmes** : une borne récursive, `<E extends Comparable<E>>`. Pour `identity`, un seul `UnaryOperator<Object>` statique, casté en `UnaryOperator<T>` : l'avertissement est sûr, puisque la fonction renvoie son argument tel quel.

## Hint 3
Supprime l'avertissement d'`identity` sur une variable locale : `@SuppressWarnings("unchecked") UnaryOperator<T> f = (UnaryOperator<T>) IDENTITY; return f;`. Pour `invert`, `<K, V> Map<V, K>`, et `putIfAbsent` qui renvoie la clé déjà présente pour cette valeur.
