import { assertType } from './kit.ts';
import type { Assignable, Equals, Expect, ExpectFalse, IsAny } from './kit.ts';

export type Checks = [
  Expect<Equals<string, string>>,
  Expect<Equals<{ a: 1; b?: string }, { a: 1; b?: string }>>,
  ExpectFalse<Equals<any, unknown>>,
  ExpectFalse<Equals<unknown, any>>,
  ExpectFalse<Equals<number[], readonly number[]>>,
  ExpectFalse<Equals<1[], number[]>>,
  ExpectFalse<Equals<{ a: 1 }, { a: 1; b?: string }>>,
  ExpectFalse<Equals<string | number, string>>,
  ExpectFalse<Equals<never, any>>,
  Expect<IsAny<any>>,
  ExpectFalse<IsAny<unknown>>,
  ExpectFalse<IsAny<never>>,
  ExpectFalse<IsAny<string>>,
  Expect<Assignable<1[], number[]>>,
  ExpectFalse<Assignable<string | number, string>>,
  ExpectFalse<Assignable<number[], 1[]>>,
];

declare const xs: number[];
declare const ones: 1[];
declare const whatever: any;
assertType<number[]>()(xs);
// @ts-expect-error trop précis : 1[] n'est pas exactement number[]
assertType<number[]>()(ones);
// @ts-expect-error any n'est pas number[]
assertType<number[]>()(whatever);
// @ts-expect-error Expect refuse false
export type Bad = Expect<false>;
