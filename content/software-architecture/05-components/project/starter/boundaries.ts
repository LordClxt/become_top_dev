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
  throw new Error('TODO: domainOf');
}

/** Jalon 1. Imports profonds et dépendances non déclarées entre domaines, triés par from, to, kind. */
export function checkBoundaries(graph: Graph, b: Boundaries): Violation[] {
  throw new Error('TODO: checkBoundaries');
}

/** Jalon 2. Graphe des domaines réellement utilisés (déduit des imports), voisins triés et uniques. */
export function domainGraph(graph: Graph, root: string): Record<string, string[]> {
  throw new Error('TODO: domainGraph');
}

/** Jalon 2. Les domaines pris dans un cycle de dépendances (triés). */
export function domainsInCycles(graph: Graph, root: string): string[] {
  throw new Error('TODO: domainsInCycles');
}

/** Jalon 3. Domaines touchés par des fichiers modifiés : leurs domaines et tous ceux qui en dépendent, directement ou non. */
export function impact(graph: Graph, changed: string[], root: string): string[] {
  throw new Error('TODO: impact');
}
