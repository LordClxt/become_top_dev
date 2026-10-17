export interface FillLayout { fillSortKey: number }
export interface LineLayout { lineCap: 'butt' | 'round' | 'square' }
export interface PointLayout { iconSize: number }
export interface FillPaint { fillColor: string; fillOpacity: number }
export interface LinePaint { lineColor: string; lineWidth: number }
export interface PointPaint { circleColor: string; circleRadius: number }

// TODO 1 : une union d'interfaces taguées par `type` ('fill' | 'line' | 'point').
export interface Layer {
  type: 'fill' | 'line' | 'point';
  layout: FillLayout | LineLayout | PointLayout;
  paint: FillPaint | LinePaint | PointPaint;
}

// TODO 2 : un switch exhaustif sur layer.type.
export function describeLayer(layer: Layer): string {
  throw new Error('TODO: describeLayer');
}

// TODO 3 : regroupe place et date dans un birth optionnel.
export interface Person {
  name: string;
  // les deux sont présents, ou aucun
  placeOfBirth?: string;
  dateOfBirth?: Date;
}

// TODO 4 : "Alan est né le 1912-06-23 à London." ou "Alan."
export function eulogize(person: Person): string {
  throw new Error('TODO: eulogize');
}

/** Forme plate renvoyée par l'API. */
export interface ApiPerson {
  name: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
}

// TODO 5 : convertit ; un seul des deux champs → Error('naissance incomplète').
export function fromApi(raw: ApiPerson): Person {
  throw new Error('TODO: fromApi');
}
