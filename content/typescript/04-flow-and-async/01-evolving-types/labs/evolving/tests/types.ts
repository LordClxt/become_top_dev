import type { Equals, Expect } from './expect.ts';
import type { parseOrNull, range, squaresOf, tokenize } from './collect.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof range>, number[]>>,
  Expect<Equals<ReturnType<typeof tokenize>, (string | number)[]>>,
  Expect<Equals<ReturnType<typeof parseOrNull>, number | null>>,
  Expect<Equals<ReturnType<typeof squaresOf>, number[]>>,
];
