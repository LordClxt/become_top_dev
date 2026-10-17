## Hint 1
`export type Position = [number, number, ...number[]];` puis une interface par géométrie, par exemple `interface MultiPolygon { type: 'MultiPolygon'; coordinates: Position[][][] }`.

## Hint 2
`positions` : `[geometry.coordinates]` pour un point, `coordinates` pour MultiPoint/LineString, `.flat()` pour un niveau de plus, `.flat(2)` pour MultiPolygon, et `geometry.geometries.flatMap(positions)` pour une collection.

## Hint 3
`bbox` : pars de `let box: [number, number, number, number] | null = null` et étends-la avec chaque position.
