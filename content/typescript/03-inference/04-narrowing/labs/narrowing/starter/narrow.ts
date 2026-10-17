// TODO 1 : "rien" | "texte (N)" | "nombre N" | "date AAAA-MM-JJ" | "liste de N".
export function describe(value: string | number | Date | readonly unknown[] | null): string {
  throw new Error('TODO: describe');
}

// TODO 2 : un type guard (x is T), puis compact qui l'utilise avec filter.
export function isDefined<T>(x: T | null | undefined): boolean {
  throw new Error('TODO: isDefined');
}

export function compact<T>(xs: readonly (T | null | undefined)[]): T[] {
  throw new Error('TODO: compact');
}

export interface Circle { kind: 'circle'; radius: number }
export interface Rect { kind: 'rect'; width: number; height: number }
export interface Square { kind: 'square'; side: number }
export type Shape = Circle | Rect | Square;

// TODO 3 : switch exhaustif sur kind, avec `const never: never = shape` dans default.
export function area(shape: Shape): number {
  throw new Error('TODO: area');
}

export interface Coordinate { x: number; y: number }
export interface BoundingBox { x: [number, number]; y: [number, number] }
export interface Polygon { exterior: Coordinate[]; bbox?: BoundingBox }

// TODO 4 : undefined sans bbox, sinon le point est-il dans la boîte (bornes incluses) ?
export function inBoundingBox(polygon: Polygon, pt: Coordinate): boolean | undefined {
  throw new Error('TODO: inBoundingBox');
}

// TODO 5 : une NOUVELLE Map où le compteur de word augmente de 1 (get + ??).
export function increment(counts: ReadonlyMap<string, number>, word: string): Map<string, number> {
  throw new Error('TODO: increment');
}
