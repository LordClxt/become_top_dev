## Contexte

Le type `Geometry` du fichier a été écrit à partir de quelques exemples : il ne connaît que `Point`, `LineString` et `Polygon`. Tu le remplaces par les sept géométries de la spécification GeoJSON (RFC 7946), puis tu écris une boîte englobante qui les gère toutes, y compris `GeometryCollection`.

Tu édites `geo.ts`. (Dans un vrai projet, tu installerais `@types/geojson` ; ici le bac à sable n'a pas de réseau, d'où les types écrits d'après la spécification.)

## À faire

1. `Geometry` : union taguée par `type` des sept géométries (`Point`, `MultiPoint`, `LineString`, `MultiLineString`, `Polygon`, `MultiPolygon` avec leurs `coordinates`, et `GeometryCollection` avec `geometries: Geometry[]`). `Position` = `[number, number]` **ou plus** (élévation possible : reste exact !).
2. `positions(geometry)` : toutes les positions, dans l'ordre (récursif pour les collections).
3. `bbox(geometry)` : `[minLng, minLat, maxLng, maxLat]`, ou `null` si la géométrie ne contient aucune position (collection vide).
4. `ConservationStatus` (IUCN : `'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX'`) et `isThreatened(status)` : vrai pour `VU`, `EN`, `CR`.

## Contraintes

Pas de `any`, pas d'assertion `as`. Le `switch` de `positions` est exhaustif.
