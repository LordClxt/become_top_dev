## Hint 1
Pourquoi 6 ? `super.addAll` (code de `HashSet`, hérité d'`AbstractCollection`) appelle `add` pour chaque élément, et c'est **ton** `add` redéfini qui répond. Et `super(s)` dans un constructeur de `HashSet` copie `s`.

## Hint 2
Au lieu d'étendre `HashSet`, étends `ForwardingSet` : c'est ta propre classe, qui ne s'appelle jamais elle-même, et qui transmet tout à l'ensemble contenu.

## Hint 3
`public class InstrumentedSet<E> extends ForwardingSet<E>`, constructeur `super(s)` (cette fois, il **garde** la référence), et les deux redéfinitions inchangées : `addAll` transmet au `Set` contenu, dont l'`add` interne n'est pas le tien.
