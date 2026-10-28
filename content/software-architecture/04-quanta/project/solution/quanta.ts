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
  const byId = new Map(components.map((c) => [c.id, c]));
  const parent = new Map(components.map((c) => [c.id, c.id]));
  const find = (n: string): string => {
    while (parent.get(n) !== n) { parent.set(n, parent.get(parent.get(n)!)!); n = parent.get(n)!; }
    return n;
  };
  for (const l of links) {
    for (const end of [l.from, l.to]) if (!byId.has(end)) throw new UnknownComponentError(end);
    if (l.kind === 'async') continue;
    if (byId.get(l.from)!.kind === 'queue' || byId.get(l.to)!.kind === 'queue') continue;
    parent.set(find(l.from), find(l.to));
  }
  const groups = new Map<string, string[]>();
  for (const c of components) {
    if (c.kind === 'queue') continue;
    const r = find(c.id);
    groups.set(r, [...(groups.get(r) ?? []), c.id]);
  }
  return [...groups.values()].map((g) => g.sort()).sort((a, b) => a[0]!.localeCompare(b[0]!));
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

const level = (c: Component, k: Characteristic) => c.needs?.[k] ?? 1;

/** Jalon 2. Profil de chaque quantum et appels synchrones où l'appelant exige plus que l'appelé. */
export function analyze(components: Component[], links: Link[]): { quanta: QuantumProfile[]; mismatches: Mismatch[] } {
  const byId = new Map(components.map((c) => [c.id, c]));
  const quanta = findQuanta(components, links).map((members) => {
    const needs: Partial<Record<Characteristic, number>> = {};
    for (const m of members) {
      for (const [k, v] of Object.entries(byId.get(m)!.needs ?? {}) as [Characteristic, number][]) {
        needs[k] = Math.max(needs[k] ?? 1, v);
      }
    }
    return { members, needs };
  });
  const mismatches: Mismatch[] = [];
  for (const l of links) {
    if (l.kind !== 'sync') continue;
    const a = byId.get(l.from)!, b = byId.get(l.to)!;
    const keys = new Set([...Object.keys(a.needs ?? {}), ...Object.keys(b.needs ?? {})] as Characteristic[]);
    for (const k of [...keys].sort()) {
      if (level(a, k) > level(b, k)) mismatches.push({ from: l.from, to: l.to, characteristic: k, caller: level(a, k), callee: level(b, k) });
    }
  }
  mismatches.sort((x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to) || x.characteristic.localeCompare(y.characteristic));
  return { quanta, mismatches };
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
  const arrivals = [...arrivalsMs].sort((a, b) => a - b);
  let free = 0, succeeded = 0, failed = 0, last = 0, maxWait = 0;
  const starts: number[] = [];
  for (const at of arrivals) {
    const start = Math.max(at, free);
    if ('sync' in mode) {
      if (start + serviceMs - at > mode.sync.timeoutMs) { failed++; continue; }
    } else {
      const waiting = starts.filter((s) => s > at).length;
      if (waiting >= mode.async.maxQueue) { failed++; continue; }
      starts.push(start);
    }
    free = start + serviceMs;
    succeeded++;
    last = free;
    maxWait = Math.max(maxWait, start - at);
  }
  return { succeeded, failed, lastCompletionMs: last, maxWaitMs: maxWait };
}
