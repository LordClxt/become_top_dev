export interface AppConfig {
  port: number;
  host: string;
  debug: boolean;
  features: string[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isPort = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 65535;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

export function readConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) throw new Error('configuration : un objet est attendu');
  const { port, host = 'localhost', debug = false, features = [] } = raw;
  const errors: string[] = [];
  if (!isPort(port)) errors.push('port invalide');
  if (typeof host !== 'string' || host === '') errors.push('host invalide');
  if (typeof debug !== 'boolean') errors.push('debug invalide');
  if (!isStringArray(features)) errors.push('features invalide');
  if (!isPort(port) || typeof host !== 'string' || host === '' || typeof debug !== 'boolean' || !isStringArray(features)) {
    throw new Error(`configuration : ${errors.join(' ; ')}`);
  }
  return { port, host, debug, features };
}

function parsePort(text: string | undefined): number | undefined {
  if (text === undefined || !/^\d+$/.test(text)) return undefined;
  const port = Number(text);
  return isPort(port) ? port : undefined;
}

function parseBool(text: string | undefined): boolean | undefined {
  if (text === '1' || text === 'true') return true;
  if (text === '0' || text === 'false') return false;
  return undefined;
}

export function applyEnv(config: AppConfig, env: Record<string, string | undefined>): AppConfig {
  const port = parsePort(env.APP_PORT);
  const host = env.APP_HOST;
  const debug = parseBool(env.APP_DEBUG);
  const features = env.APP_FEATURES?.split(',').map((f) => f.trim()).filter((f) => f !== '');
  return {
    port: port ?? config.port,
    host: host || config.host,
    debug: debug ?? config.debug,
    features: features ?? config.features,
  };
}

export function loadConfig(text: string, env: Record<string, string | undefined>): AppConfig {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('configuration : JSON invalide');
  }
  return applyEnv(readConfig(value), env);
}
