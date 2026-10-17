import type { Equals, Expect } from './expect.ts';
import type { parseCSV } from './rosters.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof parseCSV>, { [k: string]: string }[]>>,
];
