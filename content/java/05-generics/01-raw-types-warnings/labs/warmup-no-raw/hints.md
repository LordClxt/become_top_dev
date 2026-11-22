## Hint 1
Chaque avertissement désigne une ligne : `List`, `new ArrayList()`, `Collection`, `(E)`. Lequel disparaît en donnant simplement son paramètre au type ?

## Hint 2
`List<E> items = new ArrayList<>()` (l'opérateur diamant déduit `E`). Le cast de `get` devient inutile. Pour `addAll`, il faut une collection d'éléments qui **sont des** `E`, ou d'un sous-type de `E`.

## Hint 3
`public void addAll(Collection<? extends E> more)`. La leçon 4 expliquera ce `? extends` en détail.
