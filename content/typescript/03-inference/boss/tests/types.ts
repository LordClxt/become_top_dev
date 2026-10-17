import type { Equals, Expect } from './expect.ts';
import { isPurchase, parseEvent } from './analytics.ts';
import type { AppEvent, EventKind, Purchase } from './analytics.ts';

export type Checks = [
  Expect<Equals<EventKind, 'page_view' | 'click' | 'purchase'>>,
];

declare const events: AppEvent[];
const purchases = events.filter(isPurchase);
export type Checks2 = [Expect<Equals<typeof purchases, Purchase[]>>];

const e = parseEvent({});
// @ts-expect-error e peut être null
void e.kind;
