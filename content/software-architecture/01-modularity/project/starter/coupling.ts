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
  throw new Error('TODO: packageOf');
}

/**
 * Métriques par package, triées par nom. Les imports vers un fichier inconnu (hors du code analysé) sont ignorés.
 * `threshold` : distance au-delà de laquelle un package est classé dans une zone (0,5 par défaut).
 * Les valeurs décimales sont arrondies à 3 décimales.
 */
export function couplingMetrics(files: SourceFile[], threshold = 0.5): PackageMetrics[] {
  throw new Error('TODO: couplingMetrics');
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
  throw new Error('TODO: lcom');
}
