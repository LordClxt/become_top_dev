export interface FillLayout { fillSortKey: number }
export interface LineLayout { lineCap: 'butt' | 'round' | 'square' }
export interface PointLayout { iconSize: number }
export interface FillPaint { fillColor: string; fillOpacity: number }
export interface LinePaint { lineColor: string; lineWidth: number }
export interface PointPaint { circleColor: string; circleRadius: number }

export interface FillLayer { type: 'fill'; layout: FillLayout; paint: FillPaint }
export interface LineLayer { type: 'line'; layout: LineLayout; paint: LinePaint }
export interface PointLayer { type: 'point'; layout: PointLayout; paint: PointPaint }
export type Layer = FillLayer | LineLayer | PointLayer;

export function describeLayer(layer: Layer): string {
  switch (layer.type) {
    case 'fill': return `remplissage ${layer.paint.fillColor} (opacité ${layer.paint.fillOpacity})`;
    case 'line': return `ligne ${layer.paint.lineColor} de ${layer.paint.lineWidth}px, bouts ${layer.layout.lineCap}`;
    case 'point': return `points de rayon ${layer.paint.circleRadius} ${layer.paint.circleColor}`;
    default: {
      const never: never = layer;
      throw new Error(`calque inconnu : ${JSON.stringify(never)}`);
    }
  }
}

export interface Person {
  name: string;
  birth?: { place: string; date: Date };
}

export function eulogize(person: Person): string {
  const { name, birth } = person;
  if (!birth) return `${name}.`;
  return `${name} est né le ${birth.date.toISOString().slice(0, 10)} à ${birth.place}.`;
}

/** Forme plate renvoyée par l'API. */
export interface ApiPerson {
  name: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
}

export function fromApi(raw: ApiPerson): Person {
  const { name, placeOfBirth, dateOfBirth } = raw;
  if (placeOfBirth !== undefined && dateOfBirth !== undefined) {
    return { name, birth: { place: placeOfBirth, date: new Date(dateOfBirth) } };
  }
  if (placeOfBirth !== undefined || dateOfBirth !== undefined) throw new Error('naissance incomplète');
  return { name };
}
