import type { Equals, Expect } from './expect.ts';
import { camelize, merge, number, object, startsWith, string } from './parse.ts';
import type { Infer, Merge, ToCamel } from './parse.ts';

const merged = merge(object({ id: number(), name: string() }), object({ name: number() }));
const user = camelize(object({ first_name: string(), id: number() }));
const url = startsWith('https://');

export type Checks = [
  Expect<Equals<Merge<{ a: 1; b: 2 }, { b: 3; c: 4 }>, { a: 1; b: 3; c: 4 }>>,
  Expect<Equals<Infer<typeof merged>, { id: number; name: number }>>,
  Expect<Equals<ToCamel<'last_login_at'>, 'lastLoginAt'>>,
  Expect<Equals<Infer<typeof user>, { firstName: string; id: number }>>,
  Expect<Equals<Infer<typeof url>, `https://${string}`>>,
];
