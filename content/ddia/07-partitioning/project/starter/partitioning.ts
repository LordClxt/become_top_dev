// ---------- Jalon 1 : où vit une clé ? ----------

const utf8 = new TextEncoder();

/**
 * Fonction de hachage de Tinybase : FNV-1a 32 bits suivi d'un mélange final (les bits de poids fort de FNV seul sont
 * trop corrélés pour des clés qui se ressemblent). Même résultat dans tous les processus. (fournie)
 */
export function hash(key: string): number {
  let h = 0x811c9dc5;
  for (const b of utf8.encode(key)) h = Math.imul(h ^ b, 0x01000193);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Range l'espace des hachages [0, 2^32) en `parts` tranches contiguës de même taille ; renvoie la tranche de la clé. */
export function hashPartition(key: string, parts: number): number {
  throw new Error('TODO: hashPartition');
}

/** Partitionne par plages : bounds[i] est la plus petite clé de la partition i+1 (bounds.length + 1 partitions). */
export class RangePartitioner {
  readonly #bounds: readonly string[];

  constructor(bounds: readonly string[]) {
    this.#bounds = [...bounds];
  }

  get partitions(): number {
    return this.#bounds.length + 1;
  }

  /** Partition d'une clé : le nombre de bornes inférieures ou égales à la clé (recherche binaire). */
  locate(key: string): number {
    throw new Error('TODO: locate');
  }

  /** Partitions à interroger, dans l'ordre croissant, pour lire les clés de from à to inclus. */
  rangeQuery(from: string, to: string): number[] {
    throw new Error('TODO: rangeQuery');
  }
}

/** Ajoute un sel à une clé très chaude : "celebrity#07". */
export function saltedKey(key: string, shard: number): string {
  throw new Error('TODO: saltedKey');
}

/** Les n clés salées d'une clé chaude (celles qu'une lecture doit fusionner). */
export function allSalted(key: string, n: number): string[] {
  throw new Error('TODO: allSalted');
}

// ---------- Jalon 2 : rééquilibrer ----------

/** La mauvaise méthode : hash mod N, N étant le nombre de nœuds. (fournie) */
export function modNPartition(key: string, nodes: number): number {
  return hash(key) % nodes;
}

/** Part des clés dont l'emplacement diffère entre before et after (0 si keys est vide). */
export function movedFraction(keys: readonly string[], before: (k: string) => number, after: (k: string) => number): number {
  throw new Error('TODO: movedFraction');
}

/** Partition → nœud. */
export type Assignment = ReadonlyMap<number, string>;

/** La partition i va au nœud i mod nodes.length. */
export function assign(parts: number, nodes: readonly string[]): Assignment {
  throw new Error('TODO: assign');
}

/** Nombre de partitions de chaque nœud. */
export function load(a: Assignment): Map<string, number> {
  throw new Error('TODO: load');
}

/** L'écart entre le nœud le plus chargé et le moins chargé est d'une partition au plus. */
export function balanced(a: Assignment): boolean {
  throw new Error('TODO: balanced');
}

/** Nœud le plus chargé (à égalité, le plus petit nom), sauf skip. (fourni) */
export function pickMost(l: ReadonlyMap<string, number>, skip?: string): string {
  let best = '', bestLoad = -1;
  for (const [n, c] of l) {
    if (n === skip) continue;
    if (c > bestLoad || (c === bestLoad && n < best)) { best = n; bestLoad = c; }
  }
  return best;
}

/** Nœud le moins chargé (à égalité, le plus petit nom). (fourni) */
export function pickLeast(l: ReadonlyMap<string, number>): string {
  let best = '', bestLoad = Infinity;
  for (const [n, c] of l) {
    if (c < bestLoad || (c === bestLoad && n < best)) { best = n; bestLoad = c; }
  }
  return best;
}

/**
 * Ajoute un nœud : il vole des partitions ENTIÈRES (à chaque fois, la partition de plus grand numéro du nœud le plus
 * chargé) jusqu'à posséder floor(partitions / (nœuds + 1)). a n'est pas modifiée.
 */
export function addNode(a: Assignment, node: string): { assignment: Assignment; moved: number } {
  throw new Error('TODO: addNode');
}

/** Retire un nœud : chacune de ses partitions (par numéro croissant) va au nœud le moins chargé. */
export function removeNode(a: Assignment, node: string): { assignment: Assignment; moved: number } {
  throw new Error('TODO: removeNode');
}

// ---------- Jalon 3 : index secondaires et routage ----------

/** Document indexé par ses champs (color=red, make=Ford…). */
export interface Doc {
  id: string;
  fields: Readonly<Record<string, string>>;
}

/**
 * Range des documents dans `parts` partitions (par hachage de l'id) et cherche par champ.
 * put renvoie le nombre de partitions touchées ; query les id triés et le nombre de partitions interrogées.
 */
export interface IndexedStore {
  put(d: Doc): number;
  query(field: string, value: string): { ids: string[]; touched: number };
}

const term = (field: string, value: string) => `${field}:${value}`;
type Index = Map<string, Set<string>>; // terme → ensemble d'id

function addTo(idx: Index, t: string, id: string): void {
  let set = idx.get(t);
  if (!set) idx.set(t, (set = new Set()));
  set.add(id);
}

/** Index local : chaque partition indexe seulement ses documents. */
export class LocalIndexStore implements IndexedStore {
  readonly #index: Index[];

  constructor(parts: number) {
    this.#index = Array.from({ length: parts }, () => new Map());
  }

  /** Met à jour l'index de SA partition : 1 partition touchée. */
  put(d: Doc): number {
    throw new Error('TODO: put');
  }

  /** Interroge TOUTES les partitions (scatter/gather). */
  query(field: string, value: string): { ids: string[]; touched: number } {
    throw new Error('TODO: query');
  }
}

/** Index global : l'index est partitionné par hachage du terme « champ:valeur ». */
export class GlobalIndexStore implements IndexedStore {
  readonly #index: Index[];

  constructor(parts: number) {
    this.#index = Array.from({ length: parts }, () => new Map());
  }

  /** 1 (le document) + le nombre de partitions d'index DISTINCTES touchées par ses termes. */
  put(d: Doc): number {
    throw new Error('TODO: put');
  }

  /** Ne lit qu'UNE partition d'index : celle du terme. */
  query(field: string, value: string): { ids: string[]; touched: number } {
    throw new Error('TODO: query');
  }
}

/** Qui possède chaque partition ; version augmente à chaque rééquilibrage. */
export interface RoutingTable {
  version: number;
  owner: ReadonlyMap<number, string>;
}

/** Route les clés avec la table la plus récente reçue. */
export class Router {
  readonly #parts: number;
  #table: RoutingTable | undefined;

  constructor(parts: number) {
    this.#parts = parts;
  }

  /** N'accepte que la première table ou une version STRICTEMENT supérieure ; true si appliquée. */
  update(t: RoutingTable): boolean {
    throw new Error('TODO: update');
  }

  /** Nœud qui possède la partition de la clé ; undefined sans table. */
  nodeFor(key: string): string | undefined {
    throw new Error('TODO: nodeFor');
  }
}
