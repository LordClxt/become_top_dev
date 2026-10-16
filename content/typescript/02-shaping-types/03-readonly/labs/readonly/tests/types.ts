import type { Equals, Expect } from './expect.ts';
import { arraySum, lastTwo, rename, sortedCopy, triangles } from './pure.ts';
import type { User } from './pure.ts';

export type Checks = [
  Expect<Equals<Parameters<typeof arraySum>[0], readonly number[]>>,
  Expect<Equals<Parameters<typeof sortedCopy>[0], readonly number[]>>,
  Expect<Equals<ReturnType<typeof sortedCopy>, number[]>>,
  Expect<Equals<Parameters<typeof rename>[0], Readonly<User>>>,
  Expect<Equals<Parameters<typeof lastTwo>[0], readonly string[]>>,
  Expect<Equals<ReturnType<typeof lastTwo>, readonly [string, string] | undefined>>,
  Expect<Equals<User['name'], string>>,
];

// Un tableau ordinaire est accepté là où l'on attend un tableau en lecture seule.
export const total = arraySum([1, 2, 3]);
export const tri = triangles(3);

const u: User = { id: 'u1', name: 'Ada', tags: [] };
// @ts-expect-error id est en lecture seule
u.id = 'u2';
const ro: readonly number[] = [1, 2];
// @ts-expect-error un tableau en lecture seule n'a pas push
ro.push(3);
// @ts-expect-error readonly number[] n'est pas assignable à number[]
export const mutable: number[] = ro;
