import type { Equals, Expect } from './expect.ts';
import type { generateFile } from './codegen.ts';

export type Checks = [Expect<Equals<ReturnType<typeof generateFile>, string>>];
