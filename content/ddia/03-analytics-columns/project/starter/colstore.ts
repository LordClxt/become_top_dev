/** Table rangée par colonne : un tableau de valeurs par nom de colonne, tous de même longueur. */
export class Table {
  readonly #names: readonly string[];
  readonly #cols = new Map<string, string[]>();
  #n = 0;

  /** Table vide avec ces colonnes, dans cet ordre. (fourni) */
  constructor(...names: string[]) {
    this.#names = [...names];
    for (const name of names) this.#cols.set(name, []);
  }

  /** Nombre de lignes. (fourni) */
  get length(): number {
    return this.#n;
  }

  // ---------- Jalon 1 : le stockage par colonne ----------

  /** Ajoute une ligne : une valeur par colonne, dans l'ordre du constructeur. Mauvais nombre de valeurs : RangeError. */
  append(...row: string[]): void {
    throw new Error('TODO: append (chaque valeur dans SA colonne)');
  }

  /** Copie d'une colonne, ou undefined si elle n'existe pas. */
  column(name: string): string[] | undefined {
    throw new Error('TODO: column');
  }

  /** La i-ième ligne (dans l'ordre des colonnes), ou undefined si i est hors limites. */
  row(i: number): string[] | undefined {
    throw new Error('TODO: row (la i-ième valeur de chaque colonne)');
  }

  // ---------- Jalon 3 : tri et requêtes ----------

  /** Trie les lignes entières (stable) selon ces colonnes, dans l'ordre. Colonne inconnue : Error, table intacte. */
  sortBy(...names: string[]): void {
    throw new Error('TODO: sortBy (UNE permutation appliquée à TOUTES les colonnes)');
  }

  /**
   * Somme de la colonne measure (des entiers) sur les lignes qui vérifient tous les filtres colonne = valeur.
   * Sans filtre, toutes les lignes comptent. Colonne inconnue ou valeur non entière : Error.
   */
  sumWhere(measure: string, filters: Record<string, string> = {}): number {
    throw new Error('TODO: sumWhere (ET des bitmaps de chaque filtre, puis somme)');
  }
}

// ---------- Jalon 2 : bitmaps et compression ----------

/** Un booléen par ligne : vrai si la ligne vaut value. */
export function bitmap(col: readonly string[], value: string): boolean[] {
  throw new Error('TODO: bitmap');
}

/** ET bit à bit de deux bitmaps de même longueur, ou undefined si les longueurs diffèrent. */
export function and(a: readonly boolean[], b: readonly boolean[]): boolean[] | undefined {
  throw new Error('TODO: and');
}

/** OU bit à bit de deux bitmaps de même longueur, ou undefined si les longueurs diffèrent. */
export function or(a: readonly boolean[], b: readonly boolean[]): boolean[] | undefined {
  throw new Error('TODO: or');
}

/** Longueurs de séquences alternées, en commençant par une séquence de faux (éventuellement de longueur 0). */
export function encode(bits: readonly boolean[]): number[] {
  throw new Error('TODO: encode');
}

/** Inverse d'encode. */
export function decode(runs: readonly number[]): boolean[] {
  throw new Error('TODO: decode');
}

/** Nombre de séquences de valeurs identiques consécutives dans une colonne. */
export function runs(col: readonly string[]): number {
  throw new Error('TODO: runs');
}
