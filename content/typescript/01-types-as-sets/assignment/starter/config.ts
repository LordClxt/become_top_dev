const DEFAULT_TAGS: string[] = [];

export const DEFAULTS = { host: 'localhost', port: 8080, debug: false, tags: DEFAULT_TAGS };

// TODO 1 : déduis ces types de DEFAULTS, sans les recopier à la main.
export type Config = never;
export type ConfigKey = never;
// ConfigOverrides : toutes les clés de Config, optionnelles.
export type ConfigOverrides = never;
// Env : un dictionnaire en lecture seule, nom de variable → texte, ou undefined si absente.
export type Env = never;

// TODO 2 : renvoie `APP_HOST`, `APP_PORT`, `APP_DEBUG` ; le paramètre accepte toutes les clés SAUF 'tags'.
export function envName(key: string): string {
  throw new Error('TODO: envName');
}

// TODO 3 : priorité surcharges > environnement > valeurs par défaut.
//  - APP_PORT est un entier entre 1 et 65535, sinon RangeError.
//  - APP_DEBUG vaut true pour 'true' ou '1' (casse libre), false sinon.
//  - le tableau tags du résultat est une COPIE (jamais le tableau des valeurs par défaut).
export function loadConfig(overrides: ConfigOverrides = {}, env: Env = {}): Config {
  throw new Error('TODO: loadConfig');
}

// TODO 4 : "hôte:port", suivi de " (debug)" si debug, puis " [a,b]" s'il y a des tags.
export function describe(config: Config): string {
  throw new Error('TODO: describe');
}
