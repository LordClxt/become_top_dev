export interface Point { x: number; y: number }
export interface Dimension { width: number; height: number }

export interface RectParams {
  topLeft: Point;
  size: Dimension;
  opacity?: number;
}

export function rect({ topLeft, size, opacity = 1 }: RectParams): string {
  return `<rect x="${topLeft.x}" y="${topLeft.y}" width="${size.width}" height="${size.height}" opacity="${opacity}"/>`;
}

export function line(from: Point, to: Point): string {
  return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
}

export interface Interval { start: number; end: number }

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/** Une ligne de la table students, telle que la base la renvoie. */
export interface StudentRow {
  first_name: string;
  last_name: string;
  scores: number[];
}

export function honorRoll(rows: readonly StudentRow[], minAverage: number): string[] {
  return rows
    .map((row) => ({ row, average: row.scores.reduce((a, b) => a + b, 0) / (row.scores.length || 1) }))
    .filter(({ average }) => average >= minAverage)
    .toSorted((a, b) => b.average - a.average)
    .map(({ row, average }) => `${row.last_name.toUpperCase()} ${row.first_name} (${average.toFixed(1)})`);
}
