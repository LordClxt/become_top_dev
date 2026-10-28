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
  throw new Error('TODO: layerOf');
}

/**
 * Confronte le graphe aux règles.
 * - Jalon 1 : imports vers le haut (`upward`) et modules hors couche (`unknown-layer`).
 * - Jalon 2 : sauts de couche fermée (`skip`) ; une couche ouverte peut être sautée.
 * - Jalon 3 : variances (couverture, variances inutilisées, variance invalide).
 * Les violations sont triées par module source puis par module cible.
 */
export function checkLayers(graph: Graph, rules: Rules): Report {
  throw new Error('TODO: checkLayers');
}
