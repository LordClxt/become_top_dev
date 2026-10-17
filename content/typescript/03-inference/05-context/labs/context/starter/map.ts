export type Language = 'JavaScript' | 'TypeScript' | 'Python';
export type Position = readonly [number, number];

let currentLanguage: Language = 'JavaScript';
export function setLanguage(language: Language): string {
  currentLanguage = language;
  return `langue : ${currentLanguage}`;
}

const positions: [number, number][] = [];
// TODO 2 : panTo ne modifie pas son argument ; accepte un tuple readonly.
export function panTo(where: [number, number]): void {
  positions.push(where);
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

// TODO 1 : fais compiler setLanguage(language).
let language = 'TypeScript';
export const greeting = setLanguage(language);

export const HOME = [2.35, 48.85] as const;
export function goHome(): void {
  panTo(HOME);
}

// TODO 3 : fais compiler addLayer(cities).
const cities = { name: 'Villes', kind: 'points', visible: true };
export const layerCount = addLayer(cities);

// TODO 4 : un type de fonction pour logClick.
const logClick = (x, y) => `clic en ${x},${y}`;
export const clickMessage = onClick(logClick);

// TODO 5 : les positions passées à panTo (une copie), et la distance arrondie au centième.
export function history(): Position[] {
  throw new Error('TODO: history');
}

export function distance(a: Position, b: Position): number {
  throw new Error('TODO: distance');
}
