const DEFAULT_TAGS: string[] = [];

export const DEFAULTS = { host: 'localhost', port: 8080, debug: false, tags: DEFAULT_TAGS };

/** La configuration complète, déduite des valeurs par défaut (une seule source de vérité). */
export type Config = typeof DEFAULTS;
export type ConfigKey = keyof Config;
/** Type faible : toutes les clés sont optionnelles. */
export type ConfigOverrides = Partial<Config>;
/** Variables d'environnement : une valeur peut être absente. */
export type Env = Readonly<Record<string, string | undefined>>;

/** Nom de la variable d'environnement d'une clé scalaire. */
export function envName(key: Exclude<ConfigKey, 'tags'>): string {
  return `APP_${key.toUpperCase()}`;
}

function parsePort(text: string): number {
  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError(`port invalide : ${text}`);
  return port;
}

function parseBool(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === 'true' || value === '1';
}

/** Priorité : surcharges explicites > variables d'environnement > valeurs par défaut. */
export function loadConfig(overrides: ConfigOverrides = {}, env: Env = {}): Config {
  const host = env[envName('host')];
  const port = env[envName('port')];
  const debug = env[envName('debug')];
  return {
    host: overrides.host ?? host ?? DEFAULTS.host,
    port: overrides.port ?? (port !== undefined ? parsePort(port) : DEFAULTS.port),
    debug: overrides.debug ?? (debug !== undefined ? parseBool(debug) : DEFAULTS.debug),
    tags: [...(overrides.tags ?? DEFAULTS.tags)],
  };
}

export function describe(config: Config): string {
  const tags = config.tags.length === 0 ? '' : ` [${config.tags.join(',')}]`;
  return `${config.host}:${config.port}${config.debug ? ' (debug)' : ''}${tags}`;
}
