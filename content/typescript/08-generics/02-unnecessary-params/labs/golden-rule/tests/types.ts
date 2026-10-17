import type { Equals, Expect } from './expect.ts';
import * as s from './signatures.ts';

export type Checks = [
  Expect<Equals<typeof s.third, <C>(a: unknown, b: unknown, c: C) => C>>,
  Expect<Equals<typeof s.parseJSON, (text: string) => unknown>>,
  Expect<Equals<typeof s.printProperty, <T>(obj: T, key: keyof T) => string>>,
  Expect<Equals<typeof s.getProperty, <T, K extends keyof T>(obj: T, key: K) => T[K]>>,
  Expect<Equals<typeof s.getLength, (x: ArrayLike<unknown>) => number>>,
  Expect<Equals<typeof s.join, (els: readonly (string | number)[]) => string>>,
  Expect<Equals<'Joiner' extends keyof typeof s ? true : false, false>>,
];
