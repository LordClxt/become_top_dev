/**
 * archkit — un cœur microkernel pour l'évaluation d'appareils.
 *
 * Le cœur ne connaît aucun appareil : il localise le plug-in dans son registre, lui passe les données,
 * vérifie le contrat de sa réponse, et isole ses pannes.
 */

export interface DeviceData {
  serial: string;
  model: string;
  batteryHealthPct: number;
  screenCracked: boolean;
}

export interface AssessmentOutput {
  assessmentReport: string;
  resell: boolean;
  value: number;
  resellPrice: number;
}

export interface AssessmentPlugin {
  name: string;
  assess(device: DeviceData): AssessmentOutput | Promise<AssessmentOutput>;
}

export class DuplicatePluginError extends Error { constructor(key: string) { super(`plug-in déjà enregistré pour ${key}`); this.name = 'DuplicatePluginError'; } }
export class NoPluginError extends Error { constructor(key: string) { super(`aucun plug-in pour ${key}`); this.name = 'NoPluginError'; } }
export class ContractViolationError extends Error {
  readonly problems: string[];
  constructor(pluginName: string, problems: string[]) {
    super(`le plug-in ${pluginName} viole le contrat : ${problems.join(' ; ')}`);
    this.name = 'ContractViolationError';
    this.problems = problems;
  }
}
export class PluginTimeoutError extends Error { constructor(name: string, ms: number) { super(`le plug-in ${name} n'a pas répondu en ${ms} ms`); this.name = 'PluginTimeoutError'; } }

/** Problèmes de contrat d'une réponse de plug-in (liste vide si elle est conforme). */
export function contractProblems(out: unknown): string[] {
  throw new Error('TODO: contractProblems');
}

export type BatchResult = { key: string; ok: true; output: AssessmentOutput } | { key: string; ok: false; error: string };

export class Core {
  private readonly registry = new Map<string, AssessmentPlugin>();

  /** Jalon 1. */
  register(key: string, plugin: AssessmentPlugin): void {
    throw new Error('TODO: register');
  }

  /** Jalon 1. */
  deregister(key: string): boolean {
    throw new Error('TODO: deregister');
  }

  /** Jalon 1. */
  keys(): string[] {
    throw new Error('TODO: keys');
  }

  /** Jalon 1. Localise, appelle, vérifie le contrat. */
  async assess(key: string, device: DeviceData): Promise<AssessmentOutput> {
    throw new Error('TODO: assess');
  }

  /** Jalon 3. Évalue en parallèle ; la panne d'un plug-in n'empêche pas les autres. Ordre conservé. */
  async assessAll(jobs: { key: string; device: DeviceData }[]): Promise<BatchResult[]> {
    throw new Error('TODO: assessAll');
  }
}

/** Jalon 2. Adaptateur : fait d'un plug-in tiers au contrat différent un AssessmentPlugin standard. */
export function adapt<T>(
  name: string,
  thirdParty: (device: DeviceData) => T | Promise<T>,
  toStandard: (raw: T, device: DeviceData) => AssessmentOutput,
): AssessmentPlugin {
  throw new Error('TODO: adapt');
}

/** Jalon 2. Le chemin respecte-t-il la convention app/plugin/<domaine>/<contexte> ? */
export function pluginNamespace(path: string): { domain: string; context: string } | undefined {
  throw new Error('TODO: pluginNamespace');
}

export interface IsolationViolation {
  from: string;
  to: string;
  kind: 'plugin-to-plugin' | 'plugin-to-central-db';
}

/** Jalon 2. Un plug-in n'importe ni un autre plug-in, ni la base centrale. Tri par from puis to. */
export function checkPluginIsolation(graph: Record<string, string[]>, centralDbPrefix: string): IsolationViolation[] {
  throw new Error('TODO: checkPluginIsolation');
}

export interface Timer {
  /** Promesse résolue après `ms` millisecondes. */
  after(ms: number): Promise<void>;
}

/** Jalon 3. Plug-in distant : l'appel est abandonné (PluginTimeoutError) s'il dépasse le délai. */
export function remotePlugin(
  name: string,
  call: (device: DeviceData) => Promise<AssessmentOutput>,
  opts: { timeoutMs: number; timer: Timer },
): AssessmentPlugin {
  throw new Error('TODO: remotePlugin');
}
