/**
 * archkit — métriques de modularité.
 *
 * Un « package » est le dossier d'un fichier (`src/orders/service.ts` → `src/orders`).
 * Les métriques se calculent entre packages distincts, comme le feraient JDepend ou dependency-cruiser.
 */

export interface SourceFile {
  path: string;
  /** Chemins des fichiers importés (déjà résolus). */
  imports: string[];
  /** Nombre d'éléments abstraits déclarés (interfaces, classes abstraites, types de contrat). */
  abstractTypes: number;
  /** Nombre d'éléments concrets (classes, fonctions exportées). */
  concreteTypes: number;
}

export type Zone = 'pain' | 'uselessness' | 'main-sequence';

export interface PackageMetrics {
  name: string;
  ca: number;
  ce: number;
  instability: number;
  abstractness: number;
  distance: number;
  zone: Zone;
}

/** Dossier d'un fichier : tout ce qui précède le dernier « / » ("." pour un fichier à la racine). */
export function packageOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '.' : path.slice(0, i);
}

const round = (x: number) => Math.round(x * 1000) / 1000;

/**
 * Métriques par package, triées par nom. Les imports vers un fichier inconnu (hors du code analysé) sont ignorés.
 * `threshold` : distance au-delà de laquelle un package est classé dans une zone (0,5 par défaut).
 */
export function couplingMetrics(files: SourceFile[], threshold = 0.5): PackageMetrics[] {
  const known = new Map(files.map((f) => [f.path, packageOf(f.path)]));
  const out = new Map<string, Set<string>>();
  const inc = new Map<string, Set<string>>();
  const abs = new Map<string, number>();
  const con = new Map<string, number>();
  for (const f of files) {
    const p = packageOf(f.path);
    if (!out.has(p)) { out.set(p, new Set()); inc.set(p, new Set()); abs.set(p, 0); con.set(p, 0); }
    abs.set(p, abs.get(p)! + f.abstractTypes);
    con.set(p, con.get(p)! + f.concreteTypes);
  }
  for (const f of files) {
    const from = packageOf(f.path);
    for (const target of f.imports) {
      const to = known.get(target);
      if (to === undefined || to === from) continue;
      out.get(from)!.add(to);
      inc.get(to)!.add(from);
    }
  }
  return [...out.keys()].sort().map((name) => {
    const ce = out.get(name)!.size;
    const ca = inc.get(name)!.size;
    const total = abs.get(name)! + con.get(name)!;
    const instability = ca + ce === 0 ? 0 : ce / (ca + ce);
    const abstractness = total === 0 ? 0 : abs.get(name)! / total;
    const distance = Math.abs(abstractness + instability - 1);
    const zone: Zone = distance <= threshold ? 'main-sequence'
      : abstractness + instability < 1 ? 'pain' : 'uselessness';
    return { name, ca, ce, instability: round(instability), abstractness: round(abstractness), distance: round(distance), zone };
  });
}

export interface Lcom {
  /** Groupes de méthodes reliées (directement ou de proche en proche) par un champ partagé. */
  groups: string[][];
  /** Nombre de groupes : 1 = cohésion structurelle, plus = classe qui en contient plusieurs. */
  score: number;
}

/**
 * LCOM d'une classe : `uses` associe chaque méthode aux champs qu'elle lit ou écrit.
 * Chaque groupe est trié, les groupes sont triés par leur première méthode.
 */
export function lcom(uses: Record<string, string[]>): Lcom {
  const methods = Object.keys(uses);
  const parent = new Map(methods.map((m) => [m, m]));
  const find = (m: string): string => {
    let r = m;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = m;
    while (c !== r) { const n = parent.get(c)!; parent.set(c, r); c = n; }
    return r;
  };
  const owner = new Map<string, string>();
  for (const m of methods) {
    for (const field of uses[m]!) {
      const o = owner.get(field);
      if (o === undefined) owner.set(field, m);
      else parent.set(find(m), find(o));
    }
  }
  const byRoot = new Map<string, string[]>();
  for (const m of methods) {
    const r = find(m);
    byRoot.set(r, [...(byRoot.get(r) ?? []), m]);
  }
  const groups = [...byRoot.values()].map((g) => g.sort()).sort((a, b) => a[0]!.localeCompare(b[0]!));
  return { groups, score: groups.length };
}
