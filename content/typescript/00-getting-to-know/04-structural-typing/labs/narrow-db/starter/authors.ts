export interface Vector2D {
  x: number;
  y: number;
}
export interface Vector3D extends Vector2D {
  z: number;
}

// TODO 1 : `length` ignore z pour un Vector3D (un Vector3D est aussi un Vector2D !).
// Accepte les deux formes et tiens compte de z quand il est présent.
export function length(v: Vector2D): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2);
}

// TODO 2 : au lieu d'exiger une grosse base de données (donc un mock), déclare et exporte une interface étroite
// `QueryRunner` avec la seule méthode utilisée : runQuery(sql, params) → Promise<lignes>, où une ligne a un `name`.
// Elle doit accepter un simple objet littéral dans les tests, sans classe ni mock.
export async function getAuthors(db): Promise<string[]> {
  throw new Error('TODO: interroger les auteurs actifs (WHERE active = $1) et renvoyer leurs noms triés');
}
