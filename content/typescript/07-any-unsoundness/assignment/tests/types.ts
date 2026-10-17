import type { Equals, Expect } from './expect.ts';
import { isRecord, readConfig } from './config.ts';

export type Checks = [
  Expect<Equals<Parameters<typeof readConfig>[0], unknown>>,
];

declare const v: unknown;
if (isRecord(v)) {
  const x: unknown = v.anything;
  void x;
}
