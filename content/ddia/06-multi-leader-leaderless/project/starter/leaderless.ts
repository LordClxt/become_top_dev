// ---------- Jalon 1 : vecteurs de version et compteurs convergents ----------

/** Vecteur de version : un compteur par réplica (absent = 0). */
export type VV = Readonly<Record<string, number>>;

/** Résultat de la comparaison de deux vecteurs (une union de littéraux plutôt qu'un enum). */
export type Order = 'equal' | 'before' | 'after' | 'concurrent';

/** a s'est-il produit avant b, après b, sont-ils égaux ou concurrents ? */
export function compare(a: VV, b: VV): Order {
  throw new Error('TODO: compare');
}

/** COPIE de v où le compteur du réplica est incrémenté. */
export function inc(v: VV, replica: string): VV {
  throw new Error('TODO: inc');
}

/** Nouveau vecteur : le maximum compteur par compteur (c'est aussi la fusion d'un G-Counter). */
export function merge(a: VV, b: VV): VV {
  throw new Error('TODO: merge');
}

/** Valeur d'un G-Counter : la somme des compteurs. */
export function sum(v: VV): number {
  throw new Error('TODO: sum');
}

// ---------- Jalon 2 : le serveur de versions (panier) ----------

/** Serveur à un seul réplica qui détecte les écritures concurrentes avec un numéro de version par clé. */
export class Store {
  readonly #data = new Map<string, { version: number; siblings: { value: string; version: number }[] }>();

  /** Contenus non écrasés (dans l'ordre d'écriture) et dernier numéro de version de la clé. */
  get(key: string): { values: string[]; version: number } {
    throw new Error('TODO: get');
  }

  /**
   * Écrit value en précisant la version lue au préalable (0 si rien lu). Nouveau numéro de version ; les contenus de
   * version <= version reçue sont écrasés (le client les a fusionnés), les autres restent (concurrents).
   */
  put(key: string, value: string, version: number): {
    throw new Error('TODO: put');
  } {
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
  throw new Error('TODO: mergeCarts');
}

// ---------- Jalon 3 : un cluster à quorum ----------

export class QuorumError extends Error {
  constructor(got: number, need: number) { super(`quorum non atteint : ${got} sur ${need}`); this.name = 'QuorumError'; }
}

interface Versioned { value: string; version: number }

/** Un nœud du cluster. (fourni) */
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
  throw new Error('TODO: quorumOverlaps');
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
    throw new Error('TODO: write');
  }

  /**
   * Interroge les nœuds de from (tous si vide), en ignorant ceux en panne ; moins de r réponses : QuorumError.
   * Renvoie la valeur de plus haute version (clé absente : '', 0) et répare les nœuds consultés en retard.
   */
  read(key: string, ...from: number[]): Versioned {
    throw new Error('TODO: read');
  }

  /** Version que le nœud i stocke pour la clé (0 si absente). */
  nodeVersion(i: number, key: string): number {
    throw new Error('TODO: nodeVersion');
  }

  /** Copie, pour chaque clé, la version la plus récente sur tous les nœuds en marche. */
  antiEntropy(): void {
    throw new Error('TODO: antiEntropy');
  }
}
