import type { Equals, Expect } from './expect.ts';
import { alice, initial, isPerson, makePeople, makePerson, parsePerson } from './people.ts';
import type { Person } from './people.ts';

export type Checks = [
  Expect<Equals<typeof alice, Person>>,
  Expect<Equals<Parameters<typeof initial>, [text: string]>>,
  Expect<Equals<ReturnType<typeof initial>, string>>,
  Expect<Equals<ReturnType<typeof parsePerson>, Person | null>>,
  Expect<Equals<ReturnType<typeof makePeople>, Person[]>>,
  Expect<Equals<ReturnType<typeof makePerson>, Person>>,
];

// @ts-expect-error la annotation refuse un Person sans age
export const half: Person = { name: 'Bob' };
// @ts-expect-error la annotation refuse une propriété en trop
export const extra: Person = { name: 'Bob', age: 3, nickname: 'b' };
