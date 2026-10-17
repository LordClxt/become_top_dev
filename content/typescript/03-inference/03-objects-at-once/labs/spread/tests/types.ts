import type { Equals, Expect } from './expect.ts';
import { withId } from './build.ts';

const ada = withId({ name: 'Ada', age: 36 }, 'u1');

export type Checks = [
  Expect<Equals<typeof ada, { name: string; age: number } & { id: string }>>,
];
