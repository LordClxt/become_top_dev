import type { Equals, Expect } from './expect.ts';
import { cacheLast, fetchPeak } from './peaks.ts';
import type { MountainPeak } from './peaks.ts';

const add = cacheLast((a: number, b: number) => a + b);

export type Checks = [
  Expect<Equals<ReturnType<typeof fetchPeak>, Promise<MountainPeak>>>,
  Expect<Equals<typeof add, (a: number, b: number) => number>>,
];

// @ts-expect-error les arguments gardent leur type
add('1', 2);
