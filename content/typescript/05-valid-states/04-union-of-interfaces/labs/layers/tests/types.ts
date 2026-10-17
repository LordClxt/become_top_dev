import type { Equals, Expect } from './expect.ts';
import type { FillPaint, Layer, LinePaint, Person } from './layers.ts';

export type Checks = [
  Expect<Equals<Extract<Layer, { type: 'fill' }>['paint'], FillPaint>>,
  Expect<Equals<Extract<Layer, { type: 'line' }>['paint'], LinePaint>>,
  Expect<Equals<Required<Person>['birth'], { place: string; date: Date }>>,
];

export const mixed: Layer = {
  type: 'line',
  layout: { lineCap: 'round' },
  // @ts-expect-error un paint de remplissage sur un calque de ligne
  paint: { fillColor: '#f00', fillOpacity: 1 },
};
// @ts-expect-error une naissance sans date
export const half: Person = { name: 'Alan', birth: { place: 'London' } };
