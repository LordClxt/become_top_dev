## Contexte

`PriceSeries` garde une série de prix en centimes dans un `long[]` de taille fixe. Les outils d'analyse veulent la manipuler comme une `List<Long>` : la trier avec `Collections.sort`, corriger une cotation avec `set`, travailler sur une sous-liste. Aujourd'hui, `asList()` renvoie une **copie** non modifiable : le tri lève une exception et les corrections se perdent.

## Ta mission

`asList()` renvoie une **vue** sur la série, sans copie :
- `get`, `set`, `size`, `contains`, `indexOf`, `subList`, `equals`, `hashCode` se comportent comme pour toute `List` ;
- `set` (et donc le tri) modifie la série ; deux vues de la même série voient les mêmes changements ;
- la taille est fixe : `add` et `remove` lèvent `UnsupportedOperationException` ;
- `set(i, null)` lève `NullPointerException` sans rien modifier.

Ne modifie que `PriceSeries.java`. N'écris pas les méthodes de `List` une par une.
