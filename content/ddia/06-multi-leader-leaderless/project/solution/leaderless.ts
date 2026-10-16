// ---------- Jalon 1 : vecteurs de version et compteurs convergents ----------

/** Vecteur de version : un compteur par réplica (absent = 0). */
export type VV = Readonly<Record<string, number>>;

/** Résultat de la comparaison de deux vecteurs (une union de littéraux plutôt qu'un enum). */
export type Order = 'equal' | 'before' | 'after' | 'concurrent';

/** a s'est-il produit avant b, après b, sont-ils égaux ou concurrents ? */
export function compare(a: VV, b: VV): Order {
  const aLess = Object.entries(b).some(([r, c]) => c > (a[r] ?? 0));
  const bLess = Object.entries(a).some(([r, c]) => c > (b[r] ?? 0));
  if (aLess && bLess) return 'concurrent';
  if (aLess) return 'before';
  if (bLess) return 'after';
  return 'equal';
}

/** COPIE de v où le compteur du réplica est incrémenté. */
export function inc(v: VV, replica: string): VV {
  return { ...v, [replica]: (v[replica] ?? 0) + 1 };
}

/** Nouveau vecteur : le maximum compteur par compteur (c'est aussi la fusion d'un G-Counter). */
export function merge(a: VV, b: VV): VV {
  const out: Record<string, number> = { ...a };
  for (const [r, c] of Object.entries(b)) out[r] = Math.max(out[r] ?? 0, c);
  return out;
}

/** Valeur d'un G-Counter : la somme des compteurs. */
export function sum(v: VV): number {
  return Object.values(v).reduce((s, c) => s + c, 0);
}

// ---------- Jalon 2 : le serveur de versions (panier) ----------

/** Serveur à un seul réplica qui détecte les écritures concurrentes avec un numéro de version par clé. */
export class Store {
  readonly #data = new Map<string, { version: number; siblings: { value: string; version: number }[] }>();

  /** Contenus non écrasés (dans l'ordre d'écriture) et dernier numéro de version de la clé. */
  get(key: string): { values: string[]; version: number } {
    const ks = this.#data.get(key);
    return { values: ks ? ks.siblings.map((s) => s.value) : [], version: ks?.version ?? 0 };
  }

  /**
   * Écrit value en précisant la version lue au préalable (0 si rien lu). Nouveau numéro de version ; les contenus de
   * version <= version reçue sont écrasés (le client les a fusionnés), les autres restent (concurrents).
   */
  put(key: string, value: string, version: number): { values: string[]; version: number } {
    let ks = this.#data.get(key);
    if (!ks) this.#data.set(key, (ks = { version: 0, siblings: [] }));
    ks.version++;
    ks.siblings = [...ks.siblings.filter((s) => s.version > version), { value, version: ks.version }];
    return this.get(key);
  }
}

/** Article de panier ; removed marque une suppression (tombstone). */
export interface CartItem {
  name: string;
  removed: boolean;
}

/** Union des articles, triée par nom ; supprimé dans au moins un panier → reste supprimé. */
export function mergeCarts(...carts: readonly CartItem[][]): CartItem[] {
  const removed = new Map<string, boolean>();
  for (const cart of carts) for (const it of cart) removed.set(it.name, (removed.get(it.name) ?? false) || it.removed);
  return [...removed].sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, r]) => ({ name, removed: r }));
}

// ---------- Jalon 3 : un cluster à quorum ----------

export class QuorumError extends Error {
  constructor(got: number, need: number) { super(`quorum non atteint : ${got} sur ${need}`); this.name = 'QuorumError'; }
}

interface Versioned { value: string; version: number }

class Node {
  down = false;
  readonly data = new Map<string, Versioned>();
  store(key: string, e: Versioned): void {
    const cur = this.data.get(key);
    if (!cur || e.version > cur.version) this.data.set(key, e);
  }
}

/** w + r > n : les nœuds lus et écrits se recoupent toujours. */
export function quorumOverlaps(n: number, w: number, r: number): boolean {
  return w + r > n;
}

/** Réplique chaque clé sur n nœuds ; une écriture réussit avec w confirmations, une lecture avec r réponses. */
export class Cluster {
  readonly n: number;
  readonly w: number;
  readonly r: number;
  readonly #nodes: Node[];

  constructor(n: number, w: number, r: number) {
    this.n = n;
    this.w = w;
    this.r = r;
    this.#nodes = Array.from({ length: n }, () => new Node());
  }

  /** Met un nœud en panne (ou le remet en marche). Ses données sont conservées. */
  setDown(i: number, down: boolean): void {
    this.#nodes[i]!.down = down;
  }

  /**
   * Envoie l'écriture à tous les nœuds en marche (un nœud ne garde que la version la plus récente).
   * Moins de w confirmations : QuorumError, SANS annuler les copies déjà écrites.
   */
  write(key: string, value: string, version: number): void {
    let acks = 0;
    for (const node of this.#nodes) {
      if (node.down) continue;
      node.store(key, { value, version });
      acks++;
    }
    if (acks < this.w) throw new QuorumError(acks, this.w);
  }

  /**
   * Interroge les nœuds de from (tous si vide), en ignorant ceux en panne ; moins de r réponses : QuorumError.
   * Renvoie la valeur de plus haute version (clé absente : '', 0) et répare les nœuds consultés en retard.
   */
  read(key: string, ...from: number[]): Versioned {
    const ids = from.length > 0 ? from : this.#nodes.map((_, i) => i);
    const asked = ids.map((i) => this.#nodes[i]!).filter((node) => !node.down);
    if (asked.length < this.r) throw new QuorumError(asked.length, this.r);
    let best: Versioned = { value: '', version: 0 };
    for (const node of asked) {
      const e = node.data.get(key);
      if (e && e.version > best.version) best = e;
    }
    if (best.version > 0) for (const node of asked) node.store(key, best);
    return best;
  }

  /** Version que le nœud i stocke pour la clé (0 si absente). */
  nodeVersion(i: number, key: string): number {
    return this.#nodes[i]!.data.get(key)?.version ?? 0;
  }

  /** Copie, pour chaque clé, la version la plus récente sur tous les nœuds en marche. */
  antiEntropy(): void {
    const up = this.#nodes.filter((node) => !node.down);
    const best = new Map<string, Versioned>();
    for (const node of up) {
      for (const [k, e] of node.data) if (e.version > (best.get(k)?.version ?? 0)) best.set(k, e);
    }
    for (const node of up) for (const [k, e] of best) node.store(k, e);
  }
}
