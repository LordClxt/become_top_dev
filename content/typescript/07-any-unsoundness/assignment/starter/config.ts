export interface AppConfig {
  port: number;
  host: string;
  debug: boolean;
  features: string[];
}

// TODO 1 : un type guard.
export function isRecord(value: unknown): boolean {
  throw new Error('TODO: isRecord');
}

// TODO 2 : valide un unknown ; erreurs collectées.
export function readConfig(raw: any): AppConfig {
  return { port: raw.port, host: raw.host ?? 'localhost', debug: raw.debug ?? false, features: raw.features ?? [] };
}

// TODO 3 : variables d'environnement, nouvel objet.
export function applyEnv(config: AppConfig, env: Record<string, string | undefined>): AppConfig {
  throw new Error('TODO: applyEnv');
}

// TODO 4
export function loadConfig(text: string, env: Record<string, string | undefined>): AppConfig {
  return applyEnv(readConfig(JSON.parse(text)), env);
}
