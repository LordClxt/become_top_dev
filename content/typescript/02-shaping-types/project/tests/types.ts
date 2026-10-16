import type { Equals, Expect } from './expect.ts';
import { array, boolean, number, object, partial, pick, record, string, tuple } from './parse.ts';
import type { Infer } from './parse.ts';

const user = object({ name: string(), age: number(), admin: boolean() });
const point = tuple(number(), number());
const labelled = tuple(string(), number(), boolean());
const scores = record(number());
const summary = pick(user, ['name', 'age']);
const draft = partial(user);

export type Checks = [
  Expect<Equals<Infer<typeof point>, [number, number]>>,
  Expect<Equals<Infer<typeof labelled>, [string, number, boolean]>>,
  Expect<Equals<Infer<typeof scores>, Map<string, number>>>,
  Expect<Equals<Infer<typeof summary>, { name: string; age: number }>>,
  Expect<Equals<Infer<typeof draft>, { name: string | undefined; age: number | undefined; admin: boolean | undefined }>>,
  Expect<Equals<typeof summary.shape, { name: ReturnType<typeof string>; age: ReturnType<typeof number> }>>,
  Expect<Equals<Infer<ReturnType<typeof array<string>>>, string[]>>,
];

// @ts-expect-error 'email' n'est pas un champ du schéma user
pick(user, ['name', 'email']);
// @ts-expect-error tuple exige au moins un schéma
tuple();
