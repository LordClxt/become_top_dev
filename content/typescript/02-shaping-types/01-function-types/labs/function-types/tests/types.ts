import type { Equals, Expect } from './expect.ts';
import { add, apply, checkedFetch, div, fetchText, mul, sub } from './fetching.ts';
import type { BinaryFn, FetchArgs } from './fetching.ts';

export type Checks = [
  Expect<Equals<BinaryFn, (a: number, b: number) => number>>,
  Expect<Equals<typeof add, BinaryFn>>,
  Expect<Equals<typeof sub, BinaryFn>>,
  Expect<Equals<typeof mul, BinaryFn>>,
  Expect<Equals<typeof div, BinaryFn>>,
  Expect<Equals<typeof checkedFetch, typeof fetch>>,
  Expect<Equals<FetchArgs, Parameters<typeof fetch>>>,
  Expect<Equals<ReturnType<typeof fetchText>, Promise<string>>>,
];

// @ts-expect-error 'pow' n'est pas une opération
apply('pow', 2, 3);
