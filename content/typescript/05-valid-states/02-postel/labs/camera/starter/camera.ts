/** Forme canonique d'une coordonnée. */
export interface LngLat {
  lng: number;
  lat: number;
}
/** Formes acceptées en entrée. */
export type LngLatLike = LngLat | { lon: number; lat: number } | readonly [number, number];

/** Forme canonique de la caméra (degrés pour bearing et pitch). */
export interface Camera {
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
}

// TODO 1 : dérivé de Camera : tout optionnel, center remplacé par LngLatLike.
export interface CameraOptions {
  [key: string]: unknown;
}

// TODO 2 : toutes les formes → { lng, lat }.
export function toLngLat(like: LngLatLike): LngLat {
  throw new Error('TODO: toLngLat');
}

// TODO 3 : un Camera complet ; seules les options fournies changent.
export function applyOptions(camera: Camera, options: CameraOptions): Camera {
  throw new Error('TODO: applyOptions');
}

// TODO 4 : n'importe quel Iterable ; null si vide.
export function centerOf(points: LngLatLike[]): LngLat | null {
  throw new Error('TODO: centerOf');
}

// TODO 5 : un Camera complet ; Error si aucun point.
export function viewportFor(points: Iterable<LngLatLike>, zoomForSpanDeg: (spanDeg: number) => number): Camera {
  throw new Error('TODO: viewportFor');
}
