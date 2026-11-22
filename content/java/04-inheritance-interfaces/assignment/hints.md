## Hint 1
Compte les façons d'insérer dans une `List`, aujourd'hui et demain. Redéfinir chacune est une course perdue d'avance (leçon 1). Existe-t-il une implémentation de `List` où toutes les insertions passent par une seule méthode ?

## Hint 2
`AbstractList` (leçon 3) : `add(E)`, `addAll`, `listIterator().add`, `subList(...).add` et les méthodes par défaut `addFirst` et `addLast` passent toutes par `add(int, E)`. Envelopper la liste reçue et contrôler la capacité là, c'est un seul point de passage.

## Hint 3
`final class BoundedList<E> extends AbstractList<E>` avec un champ `List<E> list` : `get`, `set`, `size`, `remove(int)` transmettent ; `add(int, E)` vérifie puis transmet. Redéfinis `addAll(int, Collection)` pour vérifier le lot entier avant d'écrire. Incrémente `modCount` dans les méthodes qui changent la taille : les itérateurs et les sous-listes d'`AbstractList` s'en servent pour détecter les modifications concurrentes.
