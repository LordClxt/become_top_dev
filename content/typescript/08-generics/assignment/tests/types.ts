import type { Equals, Expect } from './expect.ts';
import { getPath } from './paths.ts';
import type { Handlers, Paths, PathValue } from './paths.ts';

interface Config {
  db: { host: string; pool: { max: number } };
  tags: string[];
  createdAt: Date;
}
declare const config: Config;
const max = getPath(config, 'db.pool.max');

export type Checks = [
  Expect<Equals<Paths<Config>, 'db' | 'db.host' | 'db.pool' | 'db.pool.max' | 'tags' | 'createdAt'>>,
  Expect<Equals<PathValue<Config, 'db.pool'>, { max: number }>>,
  Expect<Equals<PathValue<Config, 'tags'>, string[]>>,
  Expect<Equals<typeof max, number>>,
  Expect<Equals<Handlers<{ save: number; load: string }>, { onSave?: (payload: number) => void; onLoad?: (payload: string) => void }>>,
];

// @ts-expect-error chemin inexistant
getPath(config, 'db.port');
// @ts-expect-error handler mal nommé
export const h: Handlers<{ save: number }> = { onsave: () => {} };
