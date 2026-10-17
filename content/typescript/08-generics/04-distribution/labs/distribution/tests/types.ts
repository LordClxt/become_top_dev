import type { Equals, Expect } from './expect.ts';
import { isLessThan, repeat } from './distribution.ts';
import type { IsNever, IsTrue, NTuple, ToArray, ToArrayND } from './distribution.ts';

const pair = repeat('a', 2);

export type Checks = [
  Expect<Equals<ToArray<string | number>, string[] | number[]>>,
  Expect<Equals<ToArrayND<string | number>, (string | number)[]>>,
  Expect<Equals<IsNever<never>, true>>,
  Expect<Equals<IsNever<string>, false>>,
  Expect<Equals<IsTrue<true>, true>>,
  Expect<Equals<IsTrue<boolean>, false>>,
  Expect<Equals<NTuple<bigint, 2 | 3>, [bigint, bigint] | [bigint, bigint, bigint]>>,
  Expect<Equals<NTuple<string, 0>, []>>,
  Expect<Equals<typeof pair, [string, string]>>,
];

declare const dateOrStr: Date | string;
// @ts-expect-error une union mélangée n'est comparable à rien
isLessThan(dateOrStr, 'B');
// @ts-expect-error une date ne se compare pas à une chaîne
isLessThan(new Date(), 'B');
