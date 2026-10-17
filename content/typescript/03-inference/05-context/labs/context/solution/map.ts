export type Language = 'JavaScript' | 'TypeScript' | 'Python';
export type Position = readonly [number, number];

let currentLanguage: Language = 'JavaScript';
export function setLanguage(language: Language): string {
  currentLanguage = language;
  return `langue : ${currentLanguage}`;
}

const positions: [number, number][] = [];
/** panTo ne modifie pas son argument : il accepte aussi un tuple en lecture seule (as const). */
export function panTo(where: readonly [number, number]): void {
  positions.push([where[0], where[1]]);
}

export interface Layer {
  name: string;
  kind: 'points' | 'lines';
  visible: boolean;
}
const layers: Layer[] = [];
export function addLayer(layer: Layer): number {
  layers.push(layer);
  return layers.length;
}

export type ClickHandler = (x: number, y: number) => string;
export function onClick(handler: ClickHandler): string {
  return handler(3, 4);
}

const language = 'TypeScript';
export const greeting = setLanguage(language);

export const HOME = [2.35, 48.85] as const;
export function goHome(): void {
  panTo(HOME);
}

const cities: Layer = { name: 'Villes', kind: 'points', visible: true };
export const layerCount = addLayer(cities);

const logClick: ClickHandler = (x, y) => `clic en ${x},${y}`;
export const clickMessage = onClick(logClick);

export function history(): Position[] {
  return positions.map(([x, y]) => [x, y]);
}

export function distance(a: Position, b: Position): number {
  return Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 100) / 100;
}
