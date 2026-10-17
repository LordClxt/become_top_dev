import type { Equals, Expect } from './expect.ts';
import { number, partition, refineAsync, string, transform } from './parse.ts';
import type { Infer, ParseError } from './parse.ts';

const date = transform(string(), (s) => new Date(s));
const len = transform(string(), (s) => s.length);
const parts = partition(number(), [1, 'x']);
const username = refineAsync(string(), async () => true, 'pris');

export type Checks = [
  Expect<Equals<Infer<typeof date>, Date>>,
  Expect<Equals<Infer<typeof len>, number>>,
  Expect<Equals<typeof parts, { valid: number[]; errors: ParseError[] }>>,
  Expect<Equals<ReturnType<typeof username.parseAsync>, Promise<string>>>,
];

// @ts-expect-error la vérification reçoit une string, pas un number
refineAsync(string(), async (n: number) => n > 0, 'x');
