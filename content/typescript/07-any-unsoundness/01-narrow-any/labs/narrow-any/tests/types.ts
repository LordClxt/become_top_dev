import type { Equals, Expect } from './expect.ts';
import { callTwice, countItems, loadUser, pickKeys, userLabel } from './legacy.ts';
import type { User } from './legacy.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof countItems>, number>>,
  Expect<Equals<ReturnType<typeof pickKeys>, Record<string, unknown>>>,
  Expect<Equals<ReturnType<typeof callTwice>, [unknown, unknown]>>,
  Expect<Equals<ReturnType<typeof loadUser>, User>>,
  Expect<Equals<ReturnType<typeof userLabel>, string>>,
];

// @ts-expect-error une RegExp n'est pas une liste
countItems(/123/);
// @ts-expect-error callTwice attend une fonction
callTwice(42);
