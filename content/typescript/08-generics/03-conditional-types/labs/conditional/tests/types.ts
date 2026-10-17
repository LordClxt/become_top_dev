import type { Equals, Expect } from './expect.ts';
import { convert, double, firstOrSelf } from './conditional.ts';
import type { Convert, ElementOf, Unwrap } from './conditional.ts';

declare const u: string | number;
const a = double(12);
const b = double('x');
const c = double(u);
const n = convert('int', '1');
const t = convert('text', 'x');
const f1 = firstOrSelf([1, 2]);
const f2 = firstOrSelf('a' as string);

export type Checks = [
  Expect<Equals<typeof a, number>>,
  Expect<Equals<typeof b, string>>,
  Expect<Equals<typeof c, string | number>>,
  Expect<Equals<Convert<'bool'>, boolean>>,
  Expect<Equals<typeof n, number>>,
  Expect<Equals<typeof t, string>>,
  Expect<Equals<Unwrap<Promise<Date>>, Date>>,
  Expect<Equals<Unwrap<string>, string>>,
  Expect<Equals<ElementOf<readonly boolean[]>, boolean>>,
  Expect<Equals<ElementOf<string>, never>>,
  Expect<Equals<typeof f1, number | undefined>>,
  Expect<Equals<typeof f2, string>>,
];

// @ts-expect-error type de conversion inconnu
convert('date', 'x');
