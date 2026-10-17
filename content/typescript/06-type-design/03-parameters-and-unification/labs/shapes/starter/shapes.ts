export interface Point { x: number; y: number }
export interface Dimension { width: number; height: number }

// TODO 1 : un objet de paramètres { topLeft, size, opacity? } (opacity vaut 1 par défaut).
export function rect(x: number, y: number, width: number, height: number, opacity: number): string {
  throw new Error('TODO: rect');
}

// TODO 2 : deux Point (ordre naturel : départ, arrivée).
export function line(x1: number, y1: number, x2: number, y2: number): string {
  throw new Error('TODO: line');
}

export interface Interval { start: number; end: number }

// TODO 3 : bornes incluses, commutatif.
export function overlaps(a: Interval, b: Interval): boolean {
  throw new Error('TODO: overlaps');
}

/** Une ligne de la table students, telle que la base la renvoie. */
export interface StudentRow {
  first_name: string;
  last_name: string;
  scores: number[];
}

// TODO 4 : "NOM Prénom (moyenne)", triés par moyenne décroissante, sans convertir les lignes en camelCase.
export function honorRoll(rows: readonly StudentRow[], minAverage: number): string[] {
  throw new Error('TODO: honorRoll');
}
