import type { Equals, Expect } from './expect.ts';
import { json, lazy, numberIn } from './parse.ts';
import type { Infer, Json } from './parse.ts';

export type Checks = [
  Expect<Equals<Infer<ReturnType<typeof json>>, Json>>,
  Expect<Equals<Infer<ReturnType<typeof numberIn>>, number>>,
  Expect<Equals<Infer<ReturnType<typeof lazy<string>>>, string>>,
];

export const ok: Json = { a: [1, 'x', null, { b: true }] };
// @ts-expect-error undefined n'est pas du JSON
export const bad: Json = { a: undefined };
// @ts-expect-error une Date n'est pas du JSON
export const bad2: Json = new Date();
// @ts-expect-error les options sont un objet, pas des nombres positionnels
numberIn(0, 100);
