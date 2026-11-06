## Hint 1
Calcule la forme canonique **une seule fois**, dans `of`. Ensuite, `equals`, `hashCode` et `compareTo` n'ont qu'à comparer des champs déjà normalisés.

## Hint 2
Un arrondi à 6 décimales stocké en `double` reste un `double` (avec ses `-0.0`). Stocker des **micro-degrés** dans des `int` (`Math.round(lat * 1e6)`) rend la comparaison exacte et le hash trivial. La longitude se ramène dans `[-180, 180)` avec `Math.floorMod` sur ces entiers.

## Hint 3
`lonE6 = (int) (Math.floorMod(Math.round(lon * 1e6) + 180_000_000L, 360_000_000L) - 180_000_000L)`. `toString` : `String.format(Locale.ROOT, "%.6f,%.6f", latitude(), longitude())`. `compareTo` : `Comparator.comparingInt((GeoPoint p) -> p.latE6).thenComparingInt(p -> p.lonE6)` dans un champ statique.
