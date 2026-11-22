## Hint 1
Pour chaque paramètre, demande-toi : la méthode **lit** des éléments dedans (il produit), ou **écrit** dedans (il consomme) ?

## Hint 2
PECS : Producer Extends, Consumer Super. `pushAll` lit sa source, `popAll` écrit dans sa destination. Et un `Comparable` consomme les objets qu'on lui compare.

## Hint 3
`pushAll(Iterable<? extends E> src)`, `popAll(Collection<? super E> dst)`, `<T extends Comparable<? super T>> T max(List<? extends T> list)`, `<E> Set<E> union(Set<? extends E> s1, Set<? extends E> s2)`. Pas de joker dans les types de retour.
