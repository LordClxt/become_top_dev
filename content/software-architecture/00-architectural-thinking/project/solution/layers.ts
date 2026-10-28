/**
 * archkit — fitness function de couches.
 *
 * Un graphe d'imports (module → modules importés) est confronté à une architecture en couches
 * déclarée de haut en bas. Un module appartient à la couche dont le préfixe est le plus long.
 */

/** Graphe d'imports : chemin d'un module → chemins des modules qu'il importe. */
export type Graph = Record<string, string[]>;

export interface Layer {
  name: string;
  /** Préfixe de chemin des modules de la couche, ex. "src/api/". */
  prefix: string;
  /** Une couche ouverte peut être traversée : les couches au-dessus peuvent la sauter. */
  open?: boolean;
}

/** Exception accordée par l'ARB pour un import précis. */
export interface Variance {
  from: string;
  to: string;
  reason: string;
  approvedBy: string;
}

export interface Rules {
  /** Couches, de la plus haute à la plus basse. */
  layers: Layer[];
  variances?: Variance[];
}

export type Kind = 'upward' | 'skip' | 'unknown-layer';

export interface Violation {
  from: string;
  to: string;
  kind: Kind;
  /** Message lisible : cite les couches en jeu. */
  message: string;
}

export interface Report {
  violations: Violation[];
  /** Violations couvertes par une variance. */
  waived: { violation: Violation; variance: Variance }[];
  /** Variances qui ne couvrent plus rien : exceptions périmées à supprimer. */
  unusedVariances: Variance[];
}

export class InvalidVarianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVarianceError';
  }
}

/** Couche d'un module : celle dont le préfixe est le plus long ; undefined si aucune. */
export function layerOf(module: string, layers: Layer[]): Layer | undefined {
  let best: Layer | undefined;
  for (const l of layers) {
    if (module.startsWith(l.prefix) && (!best || l.prefix.length > best.prefix.length)) best = l;
  }
  return best;
}

/** Vérifie un import isolé ; undefined s'il est permis. */
function judge(from: string, to: string, layers: Layer[]): Violation | undefined {
  const a = layerOf(from, layers);
  const b = layerOf(to, layers);
  if (!a || !b) {
    const lost = !a ? from : to;
    return { from, to, kind: 'unknown-layer', message: `${lost} n'appartient à aucune couche` };
  }
  const i = layers.indexOf(a);
  const j = layers.indexOf(b);
  if (j === i || j === i + 1) return undefined;
  if (j < i) {
    return { from, to, kind: 'upward', message: `${a.name} ne doit pas dépendre de ${b.name}, qui est au-dessus` };
  }
  const closed = layers.slice(i + 1, j).filter((l) => !l.open);
  if (closed.length === 0) return undefined;
  return {
    from, to, kind: 'skip',
    message: `${a.name} saute la couche fermée ${closed.map((l) => l.name).join(', ')} pour atteindre ${b.name}`,
  };
}

export function checkLayers(graph: Graph, rules: Rules): Report {
  const variances = rules.variances ?? [];
  for (const v of variances) {
    if (v.reason.trim() === '' || v.approvedBy.trim() === '') {
      throw new InvalidVarianceError(`variance ${v.from} → ${v.to} : une raison et un approbateur sont obligatoires`);
    }
  }
  const all: Violation[] = [];
  for (const from of Object.keys(graph).sort()) {
    for (const to of [...new Set(graph[from])].sort()) {
      const v = judge(from, to, rules.layers);
      if (v) all.push(v);
    }
  }
  const report: Report = { violations: [], waived: [], unusedVariances: [] };
  const used = new Set<Variance>();
  for (const violation of all) {
    const variance = variances.find((v) => v.from === violation.from && v.to === violation.to);
    if (variance) {
      used.add(variance);
      report.waived.push({ violation, variance });
    } else {
      report.violations.push(violation);
    }
  }
  report.unusedVariances = variances.filter((v) => !used.has(v));
  return report;
}
