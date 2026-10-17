import type { Equals, Expect } from './expect.ts';
import type { extent, Profile, UserInfo } from './stats.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof extent>, [number, number] | null>>,
  Expect<Equals<Profile['user'], UserInfo>>,
  Expect<Equals<null extends Profile['posts'] ? true : false, false>>,
];
