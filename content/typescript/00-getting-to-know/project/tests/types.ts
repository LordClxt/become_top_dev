import type { Equals, Expect } from './expect.ts';
import { boolean, number, object, optional, string } from './parse.ts';
import type { Infer, SafeResult, Schema } from './parse.ts';

const user = object({ name: string(), age: number(), admin: boolean() });
const profile = object({ owner: user, nickname: optional(string()) });

export type Checks = [
  Expect<Equals<ReturnType<typeof string>, Schema<string>>>,
  Expect<Equals<Infer<typeof user>, { name: string; age: number; admin: boolean }>>,
  Expect<Equals<Infer<typeof profile>['owner'], { name: string; age: number; admin: boolean }>>,
  Expect<Equals<Infer<typeof profile>['nickname'], string | undefined>>,
  Expect<Equals<ReturnType<(typeof user)['safeParse']>, SafeResult<{ name: string; age: number; admin: boolean }>>>,
];

const result = user.safeParse({});
if (result.success) {
  // le type de data est celui du schéma, sans aucune assertion de ta part
  const age: number = result.data.age;
  void age;
}

// @ts-expect-error `data` n'existe qu'une fois `success` testé
result.data;
// @ts-expect-error la propriété email n'est pas dans le schéma
user.parse({}).email;
