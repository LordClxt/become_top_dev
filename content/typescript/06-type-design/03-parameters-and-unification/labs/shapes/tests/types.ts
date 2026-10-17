import type { Equals, Expect } from './expect.ts';
import { line, rect } from './shapes.ts';
import type { Point } from './shapes.ts';

export type Checks = [
  Expect<Equals<Parameters<typeof rect>['length'], 1>>,
  Expect<Equals<Parameters<typeof line>, [from: Point, to: Point]>>,
];
