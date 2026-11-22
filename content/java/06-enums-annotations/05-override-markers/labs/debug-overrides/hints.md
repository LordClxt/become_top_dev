## Hint 1
Ajoute `@Override` sur les trois méthodes et recompile : le compilateur te dira lesquelles ne redéfinissent rien.

## Hint 2
`equals(SymbolKey)` est une **surcharge**, pas une redéfinition : les collections appellent `equals(Object)`. Et `hashcode` / `tostring` ne sont pas `hashCode` / `toString` : la casse compte.

## Hint 3
`@Override public boolean equals(Object o) { return o instanceof SymbolKey other && venue.equals(other.venue) && symbol.equals(other.symbol); }`, puis `@Override public int hashCode()` et `@Override public String toString()`.
