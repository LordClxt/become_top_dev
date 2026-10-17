import type { Equals, Expect } from './expect.ts';
import { omit, pick } from './utilities.ts';
import type { MyOmit, MyPartial, MyPick, MyReadonly, MyRecord, MyRequired } from './utilities.ts';

interface Person { name: string; age?: number; admin: boolean }

const p = pick({ name: 'Ada', age: 36 }, 'age');
const o = omit({ name: 'Ada', age: 36 }, 'age');

export type Checks = [
  Expect<Equals<MyPartial<Person>, { name?: string; age?: number; admin?: boolean }>>,
  Expect<Equals<MyRequired<Person>, { name: string; age: number; admin: boolean }>>,
  Expect<Equals<MyReadonly<Person>, { readonly name: string; readonly age?: number; readonly admin: boolean }>>,
  Expect<Equals<MyPick<Person, 'name' | 'admin'>, { name: string; admin: boolean }>>,
  Expect<Equals<MyOmit<Person, 'admin'>, { name: string; age?: number }>>,
  Expect<Equals<MyRecord<'a' | 'b', number>, { a: number; b: number }>>,
  Expect<Equals<typeof p, { age: number }>>,
  Expect<Equals<typeof o, { name: string }>>,
];

// @ts-expect-error firstName n'est pas une clé de Person
export type Bad1 = MyPick<Person, 'firstName'>;
// @ts-expect-error firstName n'est pas une clé de Person
export type Bad2 = MyOmit<Person, 'firstName'>;
// @ts-expect-error une clé doit être une PropertyKey
export type Bad3 = MyRecord<boolean, number>;
// @ts-expect-error clé inconnue
pick({ name: 'Ada' }, 'age');
