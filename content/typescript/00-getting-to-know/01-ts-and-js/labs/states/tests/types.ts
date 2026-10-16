import type { Equals, Expect } from './expect.ts';
import type { State } from './states.ts';
import { byCapital, capitals, states } from './states.ts';

export type Checks = [
  Expect<Equals<State, { name: string; capital: string }>>,
  Expect<Equals<typeof states, State[]>>,
  Expect<Equals<ReturnType<typeof capitals>, string[]>>,
  Expect<Equals<ReturnType<typeof byCapital>, State | undefined>>,
];

// @ts-expect-error la faute de frappe « capitol » doit être refusée par le type State
export const typo: State = { name: 'Alaska', capitol: 'Juneau' };

// @ts-expect-error capitals attend une liste d'États, pas une chaîne
capitals('Juneau');
