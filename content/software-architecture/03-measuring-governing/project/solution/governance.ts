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

/** CC = E − N + 2P, P = nombre de composantes connexes (arêtes vues sans orientation). */
export function cyclomatic(g: FlowGraph): number {
  const parent = new Map(g.nodes.map((n) => [n, n]));
  const find = (n: string): string => {
    while (parent.get(n) !== n) {
      parent.set(n, parent.get(parent.get(n)!)!);
      n = parent.get(n)!;
    }
    return n;
  };
  for (const [a, b] of g.edges) {
    if (!parent.has(a) || !parent.has(b)) throw new UnknownNodeError(`arête ${a} → ${b} : nœud inconnu`);
    parent.set(find(a), find(b));
  }
  const components = new Set(g.nodes.map(find)).size;
  return g.edges.length - g.nodes.length + 2 * components;
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
 * Cycles du graphe d'imports : composantes fortement connexes de plus d'un module, ou module qui s'importe lui-même.
 * Chaque cycle est trié ; la liste est triée par premier module.
 */
export function findCycles(graph: Record<string, string[]>, opts: CycleOptions = {}): string[][] {
  const missing = new Set<string>();
  for (const targets of Object.values(graph)) {
    for (const t of targets) {
      if (!(t in graph) && opts.internalPrefix !== undefined && t.startsWith(opts.internalPrefix)) missing.add(t);
    }
  }
  if (missing.size > 0) throw new UnanalyzedModuleError([...missing].sort());

  // Tarjan, itératif pour supporter les longues chaînes.
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  let next = 0;
  const succ = (n: string) => (graph[n] ?? []).filter((t) => t in graph);

  for (const root of Object.keys(graph)) {
    if (index.has(root)) continue;
    const work: { node: string; i: number }[] = [{ node: root, i: 0 }];
    index.set(root, next); low.set(root, next); next++;
    stack.push(root); onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1]!;
      const targets = succ(frame.node);
      if (frame.i < targets.length) {
        const t = targets[frame.i++]!;
        if (!index.has(t)) {
          index.set(t, next); low.set(t, next); next++;
          stack.push(t); onStack.add(t);
          work.push({ node: t, i: 0 });
        } else if (onStack.has(t)) {
          low.set(frame.node, Math.min(low.get(frame.node)!, index.get(t)!));
        }
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1]!.node;
        low.set(parent, Math.min(low.get(parent)!, low.get(frame.node)!));
      }
      if (low.get(frame.node) === index.get(frame.node)) {
        const scc: string[] = [];
        let m: string;
        do { m = stack.pop()!; onStack.delete(m); scc.push(m); } while (m !== frame.node);
        const selfLoop = scc.length === 1 && (graph[frame.node] ?? []).includes(frame.node);
        if (scc.length > 1 || selfLoop) cycles.push(scc.sort());
      }
    }
  }
  return cycles.sort((a, b) => a[0]!.localeCompare(b[0]!));
}

/** Identifiant stable d'un cycle (ses modules triés, joints par « | »). */
export function cycleKey(cycle: string[]): string {
  return [...cycle].sort().join('|');
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

/** Cliquet : tolère la référence, refuse toute violation nouvelle, et ne laisse la référence que diminuer. */
export function ratchet(current: string[], baseline: string[]): RatchetResult {
  const cur = new Set(current);
  const base = new Set(baseline);
  const added = [...cur].filter((v) => !base.has(v)).sort();
  const fixed = [...base].filter((v) => !cur.has(v)).sort();
  const pass = added.length === 0;
  const nextBaseline = pass ? [...base].filter((v) => cur.has(v)).sort() : [...base].sort();
  return { pass, added, fixed, nextBaseline };
}
