import type { Equals, Expect } from './expect.ts';
import { add, firstWord, lastItem, setStatus } from './helpers.ts';
import type { StatusElement } from './helpers.ts';

export type Checks = [
  Expect<Equals<Parameters<typeof add>, [a: number, b: number]>>,
  Expect<Equals<ReturnType<typeof add>, number>>,
  Expect<Equals<Parameters<typeof firstWord>, [text: string | null]>>,
  Expect<Equals<ReturnType<typeof firstWord>, string>>,
  Expect<Equals<ReturnType<typeof lastItem>, string | undefined>>,
  Expect<Equals<Parameters<typeof setStatus>[0], StatusElement | null>>,
  Expect<Equals<StatusElement['textContent'], string | null>>,
  Expect<Equals<ReturnType<typeof setStatus>, boolean>>,
];

// @ts-expect-error null n'est pas un number : c'est exactement ce que strictNullChecks attrape
add(10, null);
// @ts-expect-error une chaîne n'est pas un number
add('10', 1);
// @ts-expect-error lastItem attend une liste de chaînes
lastItem([1, 2, 3]);
// @ts-expect-error le résultat peut être undefined : on ne l'utilise pas sans le tester
lastItem(['a']).toUpperCase();
