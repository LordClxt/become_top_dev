import type { Equals, Expect } from './expect.ts';
import { parseEvent, parseEvents, summarize } from './events.ts';
import type { AppEvent, Summary } from './events.ts';

export type Checks = [
  Expect<Equals<AppEvent['type'], 'user-created' | 'user-deleted' | 'purchase'>>,
  Expect<Equals<Parameters<typeof parseEvent>, [raw: unknown]>>,
  Expect<Equals<ReturnType<typeof parseEvent>, AppEvent>>,
  Expect<Equals<Summary, { users: number; revenueCents: number }>>,
  Expect<Equals<ReturnType<typeof summarize>, Summary>>,
  Expect<Equals<ReturnType<typeof parseEvents>['rejected'], number>>,
];

// @ts-expect-error un achat sans montant n'est pas un AppEvent
export const bad: AppEvent = { type: 'purchase', id: 'a' };
// @ts-expect-error summarize attend des événements typés, pas des objets quelconques
summarize([{ nope: 1 }]);
