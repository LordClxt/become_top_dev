import type { Equals, Expect } from './expect.ts';
import type { Booking, normalize, occupancy } from './booking.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof normalize>, Booking>>,
  Expect<Equals<ReturnType<typeof occupancy>, [Date, Date] | null>>,
  Expect<Equals<Booking['room'], 'single' | 'double' | 'suite'>>,
];
