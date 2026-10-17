import type { Equals, Expect } from './expect.ts';
import type { ConservationStatus, Geometry } from './geo.ts';

export type Checks = [
  Expect<Equals<Geometry['type'], 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection'>>,
  Expect<Equals<ConservationStatus, 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX'>>,
];

export const withElevation: Geometry = { type: 'Point', coordinates: [6.86, 45.83, 4808] };
// @ts-expect-error une collection n'a pas de coordinates
export const bad: Geometry = { type: 'GeometryCollection', coordinates: [] };
// @ts-expect-error une position a au moins deux nombres
export const bad2: Geometry = { type: 'Point', coordinates: [1] };
