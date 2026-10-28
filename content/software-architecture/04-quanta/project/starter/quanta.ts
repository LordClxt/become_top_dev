/**
 * archkit — quanta d'architecture.
 *
 * Un quantum regroupe ce qui est lié par un appel synchrone ou par des données partagées.
 * Les liens asynchrones et les files (infrastructure de messagerie) ne lient pas.
 */

export type ComponentKind = 'ui' | 'service' | 'database' | 'queue';
export type LinkKind = 'sync' | 'async' | 'data';
export type Characteristic = 'scalability' | 'elasticity' | 'availability' | 'performance';

export interface Component {
  id: string;
  kind: ComponentKind;
  /** Niveau exigé (1 = ordinaire, 3 = critique) ; absent = 1. */
  needs?: Partial<Record<Characteristic, number>>;
}

export interface Link {
  from: string;
  to: string;
  kind: LinkKind;
}

export class UnknownComponentError extends Error {
  constructor(id: string) { super(`composant inconnu : ${id}`); this.name = 'UnknownComponentError'; }
}

/** Jalon 1. Les quanta, chacun trié, triés par premier membre ; les files n'appartiennent à aucun quantum. */
export function findQuanta(components: Component[], links: Link[]): string[][] {
  throw new Error('TODO: findQuanta');
}

export interface QuantumProfile {
  members: string[];
  /** Niveau maximal exigé par un membre, pour chaque caractéristique citée. */
  needs: Partial<Record<Characteristic, number>>;
}

export interface Mismatch {
  from: string;
  to: string;
  characteristic: Characteristic;
  caller: number;
  callee: number;
}

/** Jalon 2. Profil de chaque quantum et appels synchrones où l'appelant exige plus que l'appelé. */
export function analyze(components: Component[], links: Link[]): { quanta: QuantumProfile[]; mismatches: Mismatch[] } {
  throw new Error('TODO: analyze');
}

export type Mode = { sync: { timeoutMs: number } } | { async: { maxQueue: number } };

export interface Outcome {
  succeeded: number;
  failed: number;
  /** Instant où la dernière requête traitée se termine (0 si aucune). */
  lastCompletionMs: number;
  /** Plus longue attente avant traitement parmi les requêtes traitées. */
  maxWaitMs: number;
}

/**
 * Jalon 3. Un serveur unique traite les requêtes une par une, dans l'ordre d'arrivée, en `serviceMs` chacune.
 * Synchrone : une requête n'est traitée que si elle peut finir avant le timeout de son appelant ; sinon elle échoue sans consommer de capacité.
 * Asynchrone : une requête est refusée si `maxQueue` requêtes attendent déjà (non commencées) à son arrivée ; toutes les autres sont traitées.
 */
export function settle(arrivalsMs: number[], serviceMs: number, mode: Mode): Outcome {
  throw new Error('TODO: settle');
}
