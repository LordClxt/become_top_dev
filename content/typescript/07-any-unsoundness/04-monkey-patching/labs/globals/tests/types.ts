import type { Equals, Expect } from './expect.ts';
import type { getTooltip, User } from './session.ts';

export type Checks = [
  Expect<Equals<typeof globalThis.currentUser, User | undefined>>,
  Expect<Equals<ReturnType<typeof getTooltip>, string | undefined>>,
];

// @ts-expect-error currentUser est un User
globalThis.currentUser = 'Ada';
