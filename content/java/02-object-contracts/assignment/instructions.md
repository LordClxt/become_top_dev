## Contexte

Le service de livraison dédoublonne les adresses par leurs coordonnées : `Set<GeoPoint>`, `Map<GeoPoint, Depot>`, et un `TreeMap<GeoPoint, …>` pour les parcourir par latitude. Aujourd'hui, le même entrepôt apparaît trois fois : une fois à la longitude `180`, une fois à `-180`, une fois à `179.9999999`. Tu écris un `GeoPoint` qui respecte **tous** les contrats de ce module.

## La valeur et sa forme canonique

`GeoPoint.of(double latitude, double longitude)` (pas de constructeur public) :

- latitude dans `[-90, 90]`, sinon `IllegalArgumentException` ; `NaN` ou infini refusé pour les deux ;
- précision : **6 décimales** (environ 11 cm). Deux points qui s'arrondissent pareil sont **le même point** ;
- longitude ramenée dans `[-180, 180)` : `180` devient `-180`, `190` devient `-170`, `-540` devient `-180` ;
- aux pôles (latitude `±90`), la longitude n'a pas de sens : elle vaut `0` ;
- `-0.0` et `0.0` sont le même point.

`latitude()` et `longitude()` renvoient les valeurs canoniques.

## Les contrats

- `equals` et `hashCode` : deux points de même forme canonique sont égaux et ont le même hash.
- `Comparable<GeoPoint>` : ordre par latitude, puis longitude. **Cohérent avec `equals`**.
- `toString` au **format spécifié** : latitude et longitude avec exactement 6 décimales, séparées par une virgule, point décimal quelle que soit la langue du système : `48.856600,2.352200`. Documente-le.
- `GeoPoint.parse(String)` relit ce format (espaces autour de la virgule tolérés) et garantit `parse(p.toString()).equals(p)`. Texte illisible : `IllegalArgumentException` citant le texte.

Pas de `clone` : la classe est immuable.

## Ce qui sera relu

La revue regarde **où** tu normalises (une fois, ou à chaque comparaison ?) et si les trois méthodes `equals`, `hashCode`, `compareTo` reposent bien sur les mêmes valeurs.
