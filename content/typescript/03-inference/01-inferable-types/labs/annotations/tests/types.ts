import type { Equals, Expect } from './expect.ts';
import type { add, formatProduct, getQuote, parseQuantity, Vector2D } from './quotes.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof getQuote>, Promise<number>>>,
  Expect<Equals<ReturnType<typeof add>, Vector2D>>,
  Expect<Equals<ReturnType<typeof parseQuantity>, number | null>>,
  Expect<Equals<ReturnType<typeof formatProduct>, string>>,
];
