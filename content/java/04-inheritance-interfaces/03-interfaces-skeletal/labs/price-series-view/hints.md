## Hint 1
Une `List` complète, c'est plus de vingt méthodes. Le JDK fournit une implémentation squelette qui les écrit toutes à partir de quelques primitives : laquelle, pour une liste à accès indexé ?

## Hint 2
`AbstractList` demande `get` et `size` pour une liste en lecture seule ; ajoute `set` pour une liste modifiable de taille fixe. `contains`, `indexOf`, `iterator`, `subList`, `equals`, `hashCode` et le tri en découlent.

## Hint 3
Une classe imbriquée **statique** privée `View extends AbstractList<Long> implements RandomAccess`, qui reçoit le tableau ; `set` lit l'ancienne valeur, puis `a[index] = value` (le déballage de `null` lève l'exception avant l'écriture). `asList()` renvoie `new View(cents)`.
