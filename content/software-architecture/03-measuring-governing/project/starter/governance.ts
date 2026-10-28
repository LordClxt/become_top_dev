/**
 * archkit — fitness functions de gouvernance : complexité cyclomatique, cycles de dépendances, cliquet.
 */

export interface FlowGraph {
  nodes: string[];
  /** Arêtes orientées [depuis, vers] du graphe de flot de contrôle. */
  edges: [string, string][];
}

export class UnknownNodeError extends Error {
  constructor(message: string) { super(message); this.name = 'UnknownNodeError'; }
}

/** Jalon 1. CC = E − N + 2P, P = nombre de composantes connexes (arêtes vues sans orientation). */
export function cyclomatic(g: FlowGraph): number {
  throw new Error('TODO: cyclomatic');
}

export class UnanalyzedModuleError extends Error {
  constructor(modules: string[]) {
    super(`imports vers des modules internes non analysés : ${modules.join(', ')}`);
    this.name = 'UnanalyzedModuleError';
  }
}

export interface CycleOptions {
  /** Préfixe des modules internes : un import interne vers un module absent du graphe est une erreur. */
  internalPrefix?: string;
}

/**
 * Jalon 2. Cycles du graphe d'imports : composantes fortement connexes de plus d'un module, ou module qui s'importe lui-même.
 * Chaque cycle est trié ; la liste est triée par premier module.
 */
export function findCycles(graph: Record<string, string[]>, opts: CycleOptions = {}): string[][] {
  throw new Error('TODO: findCycles');
}

/** Identifiant stable d'un cycle (ses modules triés, joints par « | »). */
export function cycleKey(cycle: string[]): string {
  throw new Error('TODO: cycleKey');
}

export interface RatchetResult {
  pass: boolean;
  /** Violations absentes de la référence : elles font échouer. */
  added: string[];
  /** Violations de la référence qui ont disparu. */
  fixed: string[];
  /** Référence à enregistrer : resserrée si tout passe, inchangée sinon. */
  nextBaseline: string[];
}

/** Jalon 3. Cliquet : tolère la référence, refuse toute violation nouvelle, et ne laisse la référence que diminuer. */
export function ratchet(current: string[], baseline: string[]): RatchetResult {
  throw new Error('TODO: ratchet');
}
