/** Une ligne de CSV : les en-têtes viennent du fichier, donc les clés sont dynamiques. Une Map est plus sûre qu'un objet. */
export type Row = Map<string, string>;

export function parseCSV(input: string): Row[] {
  const lines = input.split('\n').map((line) => line.trim()).filter((line) => line !== '');
  const [headerLine, ...dataLines] = lines;
  if (headerLine === undefined) return [];
  const headers = headerLine.split(',').map((h) => h.trim());
  return dataLines.map((line, index) => {
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length !== headers.length) {
      throw new RangeError(`ligne ${index + 2} : ${cells.length} colonnes au lieu de ${headers.length}`);
    }
    return new Map(headers.map((header, i): [string, string] => [header, cells[i]!]));
  });
}

/** Ici les clés sont connues : une interface est bien plus précise qu'une signature d'index. */
export interface Rocket {
  name: string;
  variant: string;
  thrustKn: number;
}

export function toRocket(row: Row): Rocket {
  const name = row.get('name');
  const variant = row.get('variant');
  const thrust = row.get('thrust');
  if (name === undefined || variant === undefined || thrust === undefined) {
    throw new TypeError('colonnes name, variant et thrust obligatoires');
  }
  const thrustKn = Number(thrust);
  if (Number.isNaN(thrustKn)) throw new TypeError(`poussée invalide : ${thrust}`);
  return { name, variant, thrustKn };
}

/** Exactement les clés x, y, z. */
export type Vec3D = Record<'x' | 'y' | 'z', number>;

export function addVec(a: Vec3D, b: Vec3D): Vec3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Accepte tableaux, Set, générateurs… : tout ce qu'on peut parcourir. */
export function sumAll(xs: Iterable<number>): number {
  let total = 0;
  for (const x of xs) total += x;
  return total;
}

/** Premier élément de tout ce qui a une longueur et des indices (tableau, chaîne, arguments). */
export function first<T>(xs: ArrayLike<T>): T | undefined {
  return xs.length > 0 ? xs[0] : undefined;
}
