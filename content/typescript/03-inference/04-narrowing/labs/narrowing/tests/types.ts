import type { Equals, Expect } from './expect.ts';
import { compact, isDefined } from './narrow.ts';

const nums = compact([1, null, 2]);
const values: (string | undefined)[] = ['a', undefined];
const strings = values.filter(isDefined);

export type Checks = [
  Expect<Equals<typeof nums, number[]>>,
  Expect<Equals<typeof strings, string[]>>,
];
