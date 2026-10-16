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
  return Math.floor((hash(key) * parts) / 2 ** 32);
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
    let lo = 0, hi = this.#bounds.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.#bounds[mid]! > key) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  /** Partitions à interroger, dans l'ordre croissant, pour lire les clés de from à to inclus. */
  rangeQuery(from: string, to: string): number[] {
    const out: number[] = [];
    for (let p = this.locate(from); p <= this.locate(to); p++) out.push(p);
    return out;
  }
}

/** Ajoute un sel à une clé très chaude : "celebrity#07". */
export function saltedKey(key: string, shard: number): string {
  return `${key}#${String(shard).padStart(2, '0')}`;
}

/** Les n clés salées d'une clé chaude (celles qu'une lecture doit fusionner). */
export function allSalted(key: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => saltedKey(key, i));
}

// ---------- Jalon 2 : rééquilibrer ----------

/** La mauvaise méthode : hash mod N, N étant le nombre de nœuds. (fournie) */
export function modNPartition(key: string, nodes: number): number {
  return hash(key) % nodes;
}

/** Part des clés dont l'emplacement diffère entre before et after (0 si keys est vide). */
export function movedFraction(keys: readonly string[], before: (k: string) => number, after: (k: string) => number): number {
  if (keys.length === 0) return 0;
  return keys.filter((k) => before(k) !== after(k)).length / keys.length;
}

/** Partition → nœud. */
export type Assignment = ReadonlyMap<number, string>;

/** La partition i va au nœud i mod nodes.length. */
export function assign(parts: number, nodes: readonly string[]): Assignment {
  return new Map(Array.from({ length: parts }, (_, p) => [p, nodes[p % nodes.length]!]));
}

/** Nombre de partitions de chaque nœud. */
export function load(a: Assignment): Map<string, number> {
  const out = new Map<string, number>();
  for (const n of a.values()) out.set(n, (out.get(n) ?? 0) + 1);
  return out;
}

/** L'écart entre le nœud le plus chargé et le moins chargé est d'une partition au plus. */
export function balanced(a: Assignment): boolean {
  const counts = [...load(a).values()];
  return Math.max(...counts) - Math.min(...counts) <= 1;
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
  const b = new Map(a);
  const l = load(b);
  const target = Math.floor(b.size / (l.size + 1));
  l.set(node, 0);
  for (let moved = 0; moved < target; moved++) {
    const from = pickMost(l, node);
    const victim = Math.max(...[...b].filter(([, n]) => n === from).map(([p]) => p));
    b.set(victim, node);
    l.set(from, l.get(from)! - 1);
    l.set(node, l.get(node)! + 1);
  }
  return { assignment: b, moved: target };
}

/** Retire un nœud : chacune de ses partitions (par numéro croissant) va au nœud le moins chargé. */
export function removeNode(a: Assignment, node: string): { assignment: Assignment; moved: number } {
  const b = new Map(a);
  const l = load(b);
  l.delete(node);
  const mine = [...b].filter(([, n]) => n === node).map(([p]) => p).sort((x, y) => x - y);
  for (const p of mine) {
    const to = pickLeast(l);
    b.set(p, to);
    l.set(to, l.get(to)! + 1);
  }
  return { assignment: b, moved: mine.length };
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
    const idx = this.#index[hashPartition(d.id, this.#index.length)]!;
    for (const [f, v] of Object.entries(d.fields)) addTo(idx, term(f, v), d.id);
    return 1;
  }

  /** Interroge TOUTES les partitions (scatter/gather). */
  query(field: string, value: string): { ids: string[]; touched: number } {
    const all = new Set<string>();
    for (const idx of this.#index) for (const id of idx.get(term(field, value)) ?? []) all.add(id);
    return { ids: [...all].sort(), touched: this.#index.length };
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
    const touched = new Set<number>();
    for (const [f, v] of Object.entries(d.fields)) {
      const t = term(f, v);
      const p = hashPartition(t, this.#index.length);
      addTo(this.#index[p]!, t, d.id);
      touched.add(p);
    }
    return 1 + touched.size;
  }

  /** Ne lit qu'UNE partition d'index : celle du terme. */
  query(field: string, value: string): { ids: string[]; touched: number } {
    const t = term(field, value);
    return { ids: [...(this.#index[hashPartition(t, this.#index.length)]!.get(t) ?? [])].sort(), touched: 1 };
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
    if (this.#table && t.version <= this.#table.version) return false;
    this.#table = t;
    return true;
  }

  /** Nœud qui possède la partition de la clé ; undefined sans table. */
  nodeFor(key: string): string | undefined {
    return this.#table?.owner.get(hashPartition(key, this.#parts));
  }
}
