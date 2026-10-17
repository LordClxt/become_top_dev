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

/** Forme acceptée en entrée, dérivée de la forme canonique. */
export interface CameraOptions extends Omit<Partial<Camera>, 'center'> {
  center?: LngLatLike;
}

export function toLngLat(like: LngLatLike): LngLat {
  // Array.isArray ne rétrécit pas un tuple readonly : on teste les formes objet avec `in`.
  if ('lng' in like) return { lng: like.lng, lat: like.lat };
  if ('lon' in like) return { lng: like.lon, lat: like.lat };
  return { lng: like[0], lat: like[1] };
}

export function applyOptions(camera: Camera, options: CameraOptions): Camera {
  const { center, zoom, bearing, pitch } = options;
  return {
    center: center === undefined ? camera.center : toLngLat(center),
    zoom: zoom ?? camera.zoom,
    bearing: bearing ?? camera.bearing,
    pitch: pitch ?? camera.pitch,
  };
}

export function centerOf(points: Iterable<LngLatLike>): LngLat | null {
  const all = Array.from(points, toLngLat);
  if (all.length === 0) return null;
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  return { lng: mean(all.map((p) => p.lng)), lat: mean(all.map((p) => p.lat)) };
}

export function viewportFor(points: Iterable<LngLatLike>, zoomForSpanDeg: (spanDeg: number) => number): Camera {
  const all = Array.from(points, toLngLat);
  const center = centerOf(all);
  if (center === null) throw new Error('aucun point');
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  const spanDeg = Math.max(span(all.map((p) => p.lng)), span(all.map((p) => p.lat)));
  return { center, zoom: zoomForSpanDeg(spanDeg), bearing: 0, pitch: 0 };
}
