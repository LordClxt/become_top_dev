import type { Equals, Expect } from './expect.ts';
import type { Shape } from './shapes.ts';
import { area, asNumber, parseSwitch } from './shapes.ts';

export type Checks = [
  Expect<Equals<Shape['kind'], 'square' | 'rectangle' | 'circle'>>,
  Expect<Equals<ReturnType<typeof area>, number>>,
  Expect<Equals<ReturnType<typeof asNumber>, number>>,
  Expect<Equals<Parameters<typeof parseSwitch>[0], unknown>>,
];

export const ok: Shape[] = [
  { kind: 'square', width: 2 },
  { kind: 'rectangle', width: 2, height: 3 },
  { kind: 'circle', radius: 1 },
];

// @ts-expect-error l'hexagone n'est pas une forme connue
export const bad: Shape = { kind: 'hexagon', width: 1 };
