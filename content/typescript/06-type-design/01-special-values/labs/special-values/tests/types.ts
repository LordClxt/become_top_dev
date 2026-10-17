import type { Equals, Expect } from './expect.ts';
import type { Lookup, Price, safeIndexOf } from './special.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof safeIndexOf>, number | null>>,
  Expect<Equals<Price['kind'], 'dollars' | 'credits'>>,
  Expect<Equals<Lookup<number>['status'], 'found' | 'missing' | 'forbidden'>>,
  Expect<Equals<Extract<Lookup<number>, { status: 'found' }>, { status: 'found'; value: number }>>,
];
