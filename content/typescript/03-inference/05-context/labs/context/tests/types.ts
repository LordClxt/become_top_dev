import type { Equals, Expect } from './expect.ts';
import { HOME, panTo } from './map.ts';

panTo(HOME);
panTo([1, 2]);

export type Checks = [
  Expect<Equals<Parameters<typeof panTo>[0], readonly [number, number]>>,
];
