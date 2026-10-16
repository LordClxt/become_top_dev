/** Table rangée par colonne : un tableau de valeurs par nom de colonne, tous de même longueur. */
export class Table {
  readonly #names: readonly string[];
  readonly #cols = new Map<string, string[]>();
  #n = 0;

  /** Table vide avec ces colonnes, dans cet ordre. */
  constructor(...names: string[]) {
    this.#names = [...names];
    for (const name of names) this.#cols.set(name, []);
  }

  /** Nombre de lignes. */
  get length(): number {
    return this.#n;
  }

  // ---------- Jalon 1 : le stockage par colonne ----------

  /** Ajoute une ligne : une valeur par colonne, dans l'ordre du constructeur. Mauvais nombre de valeurs : RangeError. */
  append(...row: string[]): void {
    if (row.length !== this.#names.length) {
      throw new RangeError(`ligne de ${row.length} valeurs pour ${this.#names.length} colonnes`);
    }
    this.#names.forEach((name, i) => this.#cols.get(name)!.push(row[i]!));
    this.#n++;
  }

  /** Copie d'une colonne, ou undefined si elle n'existe pas. */
  column(name: string): string[] | undefined {
    const c = this.#cols.get(name);
    return c && [...c];
  }

  /** La i-ième ligne (dans l'ordre des colonnes), ou undefined si i est hors limites. */
  row(i: number): string[] | undefined {
    if (i < 0 || i >= this.#n) return undefined;
    return this.#names.map((name) => this.#cols.get(name)![i]!);
  }

  // ---------- Jalon 3 : tri et requêtes ----------

  /** Trie les lignes entières (stable) selon ces colonnes, dans l'ordre. Colonne inconnue : Error, table intacte. */
  sortBy(...names: string[]): void {
    for (const name of names) if (!this.#cols.has(name)) throw new Error(`colonne inconnue : ${name}`);
    const keys = names.map((name) => this.#cols.get(name)!);
    const idx = Array.from({ length: this.#n }, (_, i) => i);
    idx.sort((a, b) => {
      for (const col of keys) {
        if (col[a] !== col[b]) return col[a]! < col[b]! ? -1 : 1;
      }
      return 0;
    });
    for (const [name, col] of this.#cols) this.#cols.set(name, idx.map((j) => col[j]!));
  }

  /**
   * Somme de la colonne measure (des entiers) sur les lignes qui vérifient tous les filtres colonne = valeur.
   * Sans filtre, toutes les lignes comptent. Colonne inconnue ou valeur non entière : Error.
   */
  sumWhere(measure: string, filters: Record<string, string> = {}): number {
    const m = this.#cols.get(measure);
    if (!m) throw new Error(`colonne inconnue : ${measure}`);
    let keep: boolean[] = new Array<boolean>(this.#n).fill(true);
    for (const [name, value] of Object.entries(filters)) {
      const col = this.#cols.get(name);
      if (!col) throw new Error(`colonne inconnue : ${name}`);
      keep = and(keep, bitmap(col, value))!;
    }
    let sum = 0;
    keep.forEach((k, i) => {
      if (!k) return;
      if (!/^-?\d+$/.test(m[i]!)) throw new Error(`valeur non entière dans ${measure} : "${m[i]}"`);
      sum += Number(m[i]);
    });
    return sum;
  }
}

// ---------- Jalon 2 : bitmaps et compression ----------

/** Un booléen par ligne : vrai si la ligne vaut value. */
export function bitmap(col: readonly string[], value: string): boolean[] {
  return col.map((v) => v === value);
}

/** ET bit à bit de deux bitmaps de même longueur, ou undefined si les longueurs diffèrent. */
export function and(a: readonly boolean[], b: readonly boolean[]): boolean[] | undefined {
  return a.length === b.length ? a.map((x, i) => x && b[i]!) : undefined;
}

/** OU bit à bit de deux bitmaps de même longueur, ou undefined si les longueurs diffèrent. */
export function or(a: readonly boolean[], b: readonly boolean[]): boolean[] | undefined {
  return a.length === b.length ? a.map((x, i) => x || b[i]!) : undefined;
}

/** Longueurs de séquences alternées, en commençant par une séquence de faux (éventuellement de longueur 0). */
export function encode(bits: readonly boolean[]): number[] {
  const runs: number[] = [];
  let cur = false, count = 0;
  for (const b of bits) {
    if (b === cur) { count++; continue; }
    runs.push(count);
    cur = b;
    count = 1;
  }
  if (bits.length > 0) runs.push(count);
  return runs;
}

/** Inverse d'encode. */
export function decode(runs: readonly number[]): boolean[] {
  const out: boolean[] = [];
  runs.forEach((r, i) => { for (let j = 0; j < r; j++) out.push(i % 2 === 1); });
  return out;
}

/** Nombre de séquences de valeurs identiques consécutives dans une colonne. */
export function runs(col: readonly string[]): number {
  return col.filter((v, i) => i === 0 || v !== col[i - 1]).length;
}
