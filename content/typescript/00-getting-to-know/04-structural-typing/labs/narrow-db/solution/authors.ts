export interface Vector2D {
  x: number;
  y: number;
}
export interface Vector3D extends Vector2D {
  z: number;
}

/** Longueur d'un vecteur 2D ou 3D : un `Vector3D` est aussi un `Vector2D`, il ne faut donc pas ignorer z. */
export function length(v: Vector2D | Vector3D): number {
  if ('z' in v) return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  return Math.sqrt(v.x ** 2 + v.y ** 2);
}

/** Ce dont `getAuthors` a réellement besoin : n'importe quel objet qui sait exécuter une requête. */
export interface QueryRunner {
  runQuery(sql: string, params: readonly unknown[]): Promise<readonly { name: unknown }[]>;
}

/** Noms des auteurs actifs, triés par ordre alphabétique. */
export async function getAuthors(db: QueryRunner): Promise<string[]> {
  const rows = await db.runQuery('SELECT name FROM authors WHERE active = $1', [true]);
  return rows.map((row) => String(row.name)).sort((a, b) => a.localeCompare(b));
}
