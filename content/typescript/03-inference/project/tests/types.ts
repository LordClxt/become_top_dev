import type { Equals, Expect } from './expect.ts';
import { enumeration, number, object, refine, string, withDefault } from './parse.ts';
import type { Infer } from './parse.ts';

const role = enumeration(['admin', 'editor', 'viewer']);
const email = refine(string(), (s): s is `${string}@${string}` => s.includes('@'), 'e-mail');
const settings = object({ theme: withDefault(enumeration(['dark', 'light']), 'dark'), size: withDefault(number(), 14) });

export type Checks = [
  Expect<Equals<Infer<typeof role>, 'admin' | 'editor' | 'viewer'>>,
  Expect<Equals<typeof role.options, readonly ('admin' | 'editor' | 'viewer')[]>>,
  Expect<Equals<Infer<typeof email>, `${string}@${string}`>>,
  Expect<Equals<Infer<typeof settings>, { theme: 'dark' | 'light'; size: number }>>,
];

// @ts-expect-error la valeur par défaut doit appartenir à l'énumération
withDefault(enumeration(['dark', 'light']), 'blue');
// @ts-expect-error une énumération n'est jamais vide
enumeration([]);
