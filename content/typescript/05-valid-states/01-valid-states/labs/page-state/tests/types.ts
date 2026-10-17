import type { Equals, Expect } from './expect.ts';
import type { RequestState } from './page.ts';

export type Checks = [
  Expect<Equals<RequestState['state'], 'pending' | 'error' | 'ok'>>,
  Expect<Equals<Extract<RequestState, { state: 'ok' }>, { state: 'ok'; pageText: string }>>,
  Expect<Equals<Extract<RequestState, { state: 'error' }>, { state: 'error'; error: string }>>,
];

// @ts-expect-error un état ok sans texte est invalide
export const bad: RequestState = { state: 'ok' };
// @ts-expect-error pas de texte dans un état pending
export const bad2: RequestState = { state: 'pending', pageText: 'x' };
