import { eq, run, test } from './spec.ts';
import { bbox, isThreatened, positions } from './geo.ts';

test('positions de chaque géométrie', () => {
  eq(positions({ type: 'Point', coordinates: [1, 2] }), [[1, 2]], 'Point');
  eq(positions({ type: 'Point', coordinates: [1, 2, 300] }), [[1, 2, 300]], 'Point avec élévation');
  eq(positions({ type: 'MultiPoint', coordinates: [[1, 2], [3, 4]] }), [[1, 2], [3, 4]], 'MultiPoint');
  eq(positions({ type: 'LineString', coordinates: [[0, 0], [1, 1]] }), [[0, 0], [1, 1]], 'LineString');
  eq(positions({ type: 'MultiLineString', coordinates: [[[0, 0]], [[5, 5]]] }), [[0, 0], [5, 5]], 'MultiLineString');
  eq(positions({ type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]]] }), [[0, 0], [2, 0], [2, 2], [0, 0]], 'Polygon');
  eq(positions({ type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 1]]], [[[9, 9]]]] }), [[0, 0], [1, 1], [9, 9]], 'MultiPolygon');
});

test('GeometryCollection récursive', () => {
  const g = {
    type: 'GeometryCollection' as const,
    geometries: [
      { type: 'Point' as const, coordinates: [-5, 10] as [number, number] },
      { type: 'GeometryCollection' as const, geometries: [{ type: 'LineString' as const, coordinates: [[3, -2], [4, 8]] as [number, number][] }] },
    ],
  };
  eq(positions(g), [[-5, 10], [3, -2], [4, 8]], 'positions');
  eq(bbox(g), [-5, -2, 4, 10], 'bbox');
});

test('bbox', () => {
  eq(bbox({ type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 3], [0, 0]]] }), [0, 0, 2, 3], 'polygone');
  eq(bbox({ type: 'GeometryCollection', geometries: [] }), null, 'collection vide');
});

test('isThreatened', () => {
  eq(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'].map((s) => isThreatened(s as 'LC')), [false, false, true, true, true, false, false], 'statuts');
});

await run();
