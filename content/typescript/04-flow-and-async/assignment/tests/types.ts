import type { Equals, Expect } from './expect.ts';
import { retry } from './weather.ts';

const p = retry(async () => 42, 2);
export type Checks = [Expect<Equals<typeof p, Promise<number>>>];
