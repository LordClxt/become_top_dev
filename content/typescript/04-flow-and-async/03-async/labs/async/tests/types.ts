import type { Equals, Expect } from './expect.ts';
import type { timeout, withTimeout } from './fetching.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof timeout>, Promise<never>>>,
  Expect<Equals<ReturnType<typeof withTimeout<number>>, Promise<number>>>,
];
