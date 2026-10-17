// TODO 1 : les sept géométries de la RFC 7946. Ce type « anecdotique » en oublie quatre.
export type Position = [number, number];
export interface Geometry {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: Position | Position[] | Position[][];
}

// TODO 2 : toutes les positions (récursif pour GeometryCollection).
export function positions(geometry: Geometry): Position[] {
  throw new Error('TODO: positions');
}

// TODO 3 : [minLng, minLat, maxLng, maxLat] ou null.
export function bbox(geometry: Geometry): [number, number, number, number] | null {
  throw new Error('TODO: bbox');
}

// TODO 4 : statuts IUCN et isThreatened.
export type ConservationStatus = string;

export function isThreatened(status: ConservationStatus): boolean {
  throw new Error('TODO: isThreatened');
}
