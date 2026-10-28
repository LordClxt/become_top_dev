/**
 * archkit — frontières d'un monolithe modulaire.
 *
 * Chaque dossier directement sous `root` est un domaine (`src/orders/…` → `orders`).
 * Un domaine n'expose que son point d'entrée public `index.ts` ; les dépendances entre domaines sont déclarées.
 */

export type Graph = Record<string, string[]>;

export interface Boundaries {
  /** Racine des domaines, avec la barre finale : "src/". */
  root: string;
  /** Dépendances autorisées : domaine → domaines qu'il peut importer. */
  allowed: Record<string, string[]>;
  /** Domaines importables par tous sans déclaration (noyau partagé). */
  shared?: string[];
}

export type ViolationKind = 'deep-import' | 'undeclared';

export interface Violation {
  from: string;
  to: string;
  kind: ViolationKind;
}

/** Domaine d'un fichier, ou undefined s'il n'est pas dans un dossier de domaine sous `root`. */
export function domainOf(path: string, root: string): string | undefined {
  if (!path.startsWith(root)) return undefined;
  const rest = path.slice(root.length);
  const slash = rest.indexOf('/');
  return slash <= 0 ? undefined : rest.slice(0, slash);
}

/** Jalon 1. Imports profonds et dépendances non déclarées entre domaines, triés par from, to, kind. */
export function checkBoundaries(graph: Graph, b: Boundaries): Violation[] {
  const shared = new Set(b.shared ?? []);
  const out: Violation[] = [];
  for (const [from, targets] of Object.entries(graph)) {
    const a = domainOf(from, b.root);
    if (a === undefined) continue;
    for (const to of new Set(targets)) {
      const d = domainOf(to, b.root);
      if (d === undefined || d === a) continue;
      if (to !== `${b.root}${d}/index.ts`) out.push({ from, to, kind: 'deep-import' });
      if (!shared.has(d) && !(b.allowed[a] ?? []).includes(d)) out.push({ from, to, kind: 'undeclared' });
    }
  }
  return out.sort((x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to) || x.kind.localeCompare(y.kind));
}

/** Jalon 2. Graphe des domaines réellement utilisés (déduit des imports), voisins triés et uniques. */
export function domainGraph(graph: Graph, root: string): Record<string, string[]> {
  const g: Record<string, Set<string>> = {};
  for (const [from, targets] of Object.entries(graph)) {
    const a = domainOf(from, root);
    if (a === undefined) continue;
    g[a] ??= new Set();
    for (const to of targets) {
      const d = domainOf(to, root);
      if (d === undefined || d === a) continue;
      g[a].add(d);
      g[d] ??= new Set();
    }
  }
  return Object.fromEntries(Object.keys(g).sort().map((k) => [k, [...g[k]!].sort()]));
}

/** Jalon 2. Les domaines pris dans un cycle de dépendances (triés). */
export function domainsInCycles(graph: Graph, root: string): string[] {
  const dg = domainGraph(graph, root);
  const inCycle: string[] = [];
  for (const start of Object.keys(dg)) {
    const seen = new Set<string>();
    const stack = [...dg[start]!];
    while (stack.length > 0) {
      const n = stack.pop()!;
      if (n === start) { inCycle.push(start); break; }
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...(dg[n] ?? []));
    }
  }
  return inCycle.sort();
}

/** Jalon 3. Domaines touchés par des fichiers modifiés : leurs domaines et tous ceux qui en dépendent, directement ou non. */
export function impact(graph: Graph, changed: string[], root: string): string[] {
  const dg = domainGraph(graph, root);
  const dependents = new Map<string, string[]>();
  for (const [a, targets] of Object.entries(dg)) {
    for (const d of targets) dependents.set(d, [...(dependents.get(d) ?? []), a]);
  }
  const hit = new Set<string>();
  const queue = changed.map((f) => domainOf(f, root)).filter((d): d is string => d !== undefined);
  while (queue.length > 0) {
    const d = queue.shift()!;
    if (hit.has(d)) continue;
    hit.add(d);
    queue.push(...(dependents.get(d) ?? []));
  }
  return [...hit].sort();
}
