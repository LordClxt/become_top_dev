import type { Equals, Expect } from './expect.ts';
import { assertValid, instanceOf, is, number, object, string, strict } from './parse.ts';
import type { Infer } from './parse.ts';

const date = instanceOf(Date);
const person = strict(object({ name: string() }));

export type Checks = [
  Expect<Equals<Infer<typeof date>, Date>>,
  Expect<Equals<Infer<typeof person>, { name: string }>>,
];

declare const u: unknown;
if (is(number(), u)) {
  const n: number = u;
  void n;
}
export function f(v: unknown): string {
  assertValid(string(), v);
  return v.toUpperCase();
}
