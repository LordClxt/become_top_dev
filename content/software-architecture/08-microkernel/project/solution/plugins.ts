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
  const o = (out ?? {}) as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof o.assessmentReport !== 'string' || o.assessmentReport.trim() === '') problems.push('assessmentReport doit être un texte non vide');
  if (typeof o.resell !== 'boolean') problems.push('resell doit être un booléen');
  for (const k of ['value', 'resellPrice'] as const) {
    const v = o[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) problems.push(`${k} doit être un nombre positif ou nul`);
  }
  if (o.resell === false && o.resellPrice !== 0) problems.push('resellPrice doit valoir 0 si l’appareil n’est pas revendu');
  return problems;
}

export type BatchResult = { key: string; ok: true; output: AssessmentOutput } | { key: string; ok: false; error: string };

export class Core {
  private readonly registry = new Map<string, AssessmentPlugin>();

  /** Jalon 1. */
  register(key: string, plugin: AssessmentPlugin): void {
    if (this.registry.has(key)) throw new DuplicatePluginError(key);
    this.registry.set(key, plugin);
  }

  /** Jalon 1. */
  deregister(key: string): boolean {
    return this.registry.delete(key);
  }

  /** Jalon 1. */
  keys(): string[] {
    return [...this.registry.keys()].sort();
  }

  /** Jalon 1. Localise, appelle, vérifie le contrat. */
  async assess(key: string, device: DeviceData): Promise<AssessmentOutput> {
    const plugin = this.registry.get(key);
    if (!plugin) throw new NoPluginError(key);
    const out = await plugin.assess(device);
    const problems = contractProblems(out);
    if (problems.length > 0) throw new ContractViolationError(plugin.name, problems);
    return out;
  }

  /** Jalon 3. Évalue en parallèle ; la panne d'un plug-in n'empêche pas les autres. Ordre conservé. */
  async assessAll(jobs: { key: string; device: DeviceData }[]): Promise<BatchResult[]> {
    return Promise.all(jobs.map(async ({ key, device }): Promise<BatchResult> => {
      try {
        return { key, ok: true, output: await this.assess(key, device) };
      } catch (e) {
        return { key, ok: false, error: e instanceof Error ? e.name : String(e) };
      }
    }));
  }
}

/** Jalon 2. Adaptateur : fait d'un plug-in tiers au contrat différent un AssessmentPlugin standard. */
export function adapt<T>(
  name: string,
  thirdParty: (device: DeviceData) => T | Promise<T>,
  toStandard: (raw: T, device: DeviceData) => AssessmentOutput,
): AssessmentPlugin {
  return { name, assess: async (device) => toStandard(await thirdParty(device), device) };
}

const PLUGIN = /^app\/plugin\/([a-z0-9-]+)\/([a-z0-9-]+)(\/|$)/;

/** Jalon 2. Le chemin respecte-t-il la convention app/plugin/<domaine>/<contexte> ? */
export function pluginNamespace(path: string): { domain: string; context: string } | undefined {
  const m = PLUGIN.exec(path);
  return m ? { domain: m[1]!, context: m[2]! } : undefined;
}

export interface IsolationViolation {
  from: string;
  to: string;
  kind: 'plugin-to-plugin' | 'plugin-to-central-db';
}

/** Jalon 2. Un plug-in n'importe ni un autre plug-in, ni la base centrale. Tri par from puis to. */
export function checkPluginIsolation(graph: Record<string, string[]>, centralDbPrefix: string): IsolationViolation[] {
  const out: IsolationViolation[] = [];
  for (const [from, targets] of Object.entries(graph)) {
    const a = pluginNamespace(from);
    if (!a) continue;
    for (const to of new Set(targets)) {
      const b = pluginNamespace(to);
      if (b && (b.domain !== a.domain || b.context !== a.context)) out.push({ from, to, kind: 'plugin-to-plugin' });
      else if (to.startsWith(centralDbPrefix)) out.push({ from, to, kind: 'plugin-to-central-db' });
    }
  }
  return out.sort((x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to));
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
  return {
    name,
    assess: (device) => Promise.race([
      call(device),
      opts.timer.after(opts.timeoutMs).then((): never => { throw new PluginTimeoutError(name, opts.timeoutMs); }),
    ]),
  };
}
