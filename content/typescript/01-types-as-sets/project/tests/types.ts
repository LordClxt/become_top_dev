import type { Equals, Expect } from './expect.ts';
import { array, literal, number, object, optional, string, union } from './parse.ts';
import type { Infer } from './parse.ts';

const role = union(literal('admin'), literal('user'), literal('guest'));
const id = union(string(), number());
const user = object({ name: string(), role, tags: array(string()), friends: optional(array(number())) });

export type Checks = [
  Expect<Equals<Infer<ReturnType<typeof literal<'x'>>>, 'x'>>,
  Expect<Equals<Infer<typeof role>, 'admin' | 'user' | 'guest'>>,
  Expect<Equals<Infer<typeof id>, string | number>>,
  Expect<Equals<Infer<ReturnType<typeof array<boolean>>>, boolean[]>>,
  Expect<Equals<Infer<typeof user>, { name: string; role: 'admin' | 'user' | 'guest'; tags: string[]; friends: number[] | undefined }>>,
];

// @ts-expect-error 'root' n'appartient pas à l'ensemble des rôles
export const bad: Infer<typeof role> = 'root';
// @ts-expect-error union exige au moins un schéma
union();
