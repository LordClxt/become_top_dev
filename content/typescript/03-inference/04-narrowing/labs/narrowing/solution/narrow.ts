export function describe(value: string | number | Date | readonly unknown[] | null): string {
  if (value === null) return 'rien';
  if (typeof value === 'string') return `texte (${value.length})`;
  if (typeof value === 'number') return `nombre ${value}`;
  if (value instanceof Date) return `date ${value.toISOString().slice(0, 10)}`;
  return `liste de ${value.length}`;
}

export function isDefined<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}

export function compact<T>(xs: readonly (T | null | undefined)[]): T[] {
  return xs.filter(isDefined);
}

export interface Circle { kind: 'circle'; radius: number }
export interface Rect { kind: 'rect'; width: number; height: number }
export interface Square { kind: 'square'; side: number }
export type Shape = Circle | Rect | Square;

export function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'rect': return shape.width * shape.height;
    case 'square': return shape.side ** 2;
    default: {
      const never: never = shape;
      throw new Error(`forme inconnue : ${JSON.stringify(never)}`);
    }
  }
}

export interface Coordinate { x: number; y: number }
export interface BoundingBox { x: [number, number]; y: [number, number] }
export interface Polygon { exterior: Coordinate[]; bbox?: BoundingBox }

export function inBoundingBox(polygon: Polygon, pt: Coordinate): boolean | undefined {
  const { bbox } = polygon;
  if (!bbox) return undefined;
  const { x, y } = bbox;
  return pt.x >= x[0] && pt.x <= x[1] && pt.y >= y[0] && pt.y <= y[1];
}

export function increment(counts: ReadonlyMap<string, number>, word: string): Map<string, number> {
  const next = new Map(counts);
  next.set(word, (counts.get(word) ?? 0) + 1);
  return next;
}
