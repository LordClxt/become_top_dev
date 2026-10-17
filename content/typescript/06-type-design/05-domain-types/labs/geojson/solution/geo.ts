/** Longitude, latitude, puis éventuellement l'élévation : exact plutôt que trop précis. */
export type Position = [number, number, ...number[]];

export interface Point { type: 'Point'; coordinates: Position }
export interface MultiPoint { type: 'MultiPoint'; coordinates: Position[] }
export interface LineString { type: 'LineString'; coordinates: Position[] }
export interface MultiLineString { type: 'MultiLineString'; coordinates: Position[][] }
export interface Polygon { type: 'Polygon'; coordinates: Position[][] }
export interface MultiPolygon { type: 'MultiPolygon'; coordinates: Position[][][] }
export interface GeometryCollection { type: 'GeometryCollection'; geometries: Geometry[] }
export type Geometry = Point | MultiPoint | LineString | MultiLineString | Polygon | MultiPolygon | GeometryCollection;

export function positions(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case 'Point': return [geometry.coordinates];
    case 'MultiPoint':
    case 'LineString': return geometry.coordinates;
    case 'MultiLineString':
    case 'Polygon': return geometry.coordinates.flat();
    case 'MultiPolygon': return geometry.coordinates.flat(2);
    case 'GeometryCollection': return geometry.geometries.flatMap(positions);
    default: {
      const never: never = geometry;
      throw new Error(`géométrie inconnue : ${JSON.stringify(never)}`);
    }
  }
}

export function bbox(geometry: Geometry): [number, number, number, number] | null {
  let box: [number, number, number, number] | null = null;
  for (const [lng, lat] of positions(geometry)) {
    box = box
      ? [Math.min(box[0], lng), Math.min(box[1], lat), Math.max(box[2], lng), Math.max(box[3], lat)]
      : [lng, lat, lng, lat];
  }
  return box;
}

/** Statuts de conservation de l'IUCN, du moins au plus menacé. */
export type ConservationStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';

export function isThreatened(status: ConservationStatus): boolean {
  return status === 'VU' || status === 'EN' || status === 'CR';
}
