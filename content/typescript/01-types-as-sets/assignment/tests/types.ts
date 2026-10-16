import type { Equals, Expect } from './expect.ts';
import { DEFAULTS, describe, envName, loadConfig } from './config.ts';
import type { Config, ConfigKey, ConfigOverrides, Env } from './config.ts';

export type Checks = [
  Expect<Equals<Config, { host: string; port: number; debug: boolean; tags: string[] }>>,
  Expect<Equals<ConfigKey, 'host' | 'port' | 'debug' | 'tags'>>,
  Expect<Equals<ConfigOverrides, { host?: string; port?: number; debug?: boolean; tags?: string[] }>>,
  Expect<Equals<Env, Readonly<Record<string, string | undefined>>>>,
  Expect<Equals<Parameters<typeof envName>[0], 'host' | 'port' | 'debug'>>,
  Expect<Equals<ReturnType<typeof loadConfig>, Config>>,
];

export const d: Config = DEFAULTS;
loadConfig({ port: 9000 }, { APP_HOST: 'example.org' });
describe(d);

// @ts-expect-error faute de frappe dans un littéral : prot n'existe pas
loadConfig({ prot: 9000 });
// @ts-expect-error tags n'a pas de variable d'environnement
envName('tags');
// @ts-expect-error le port est un nombre
loadConfig({ port: '9000' });
const typo = { prot: 1 };
// @ts-expect-error type faible : aucune propriété en commun
loadConfig(typo);
