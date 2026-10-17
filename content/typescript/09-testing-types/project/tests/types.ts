import type { Equals, Expect } from './expect.ts';
import { fromSpec, looseObject, number, optional, string, tupleOf } from './parse.ts';
import type { Infer, NTuple, Resolve, SpecType } from './parse.ts';

const person = looseObject({ name: string(), age: optional(number()) });
const rgb = tupleOf(number(), 3);
const user = fromSpec({ name: 'string', tags: 'string[]', age: 'number?' });

export type Checks = [
  Expect<Equals<Resolve<{ a: 1 } & { b: 2 }>, { a: 1; b: 2 }>>,
  Expect<Equals<Infer<typeof person>, { name: string; age?: number }>>,
  Expect<Equals<Infer<typeof rgb>, [number, number, number]>>,
  Expect<Equals<NTuple<0, 60>['length'], 60>>,
  Expect<Equals<SpecType<{ a: 'boolean[]?'; b: 'number' }>, { b: number; a?: boolean[] }>>,
  Expect<Equals<Infer<typeof user>, { name: string; tags: string[]; age?: number }>>,
];

// @ts-expect-error type de champ inconnu
fromSpec({ when: 'date' });
