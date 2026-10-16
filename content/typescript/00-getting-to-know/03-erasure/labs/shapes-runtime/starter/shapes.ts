// Ce code a l'air raisonnable, mais `Rectangle` n'est qu'un TYPE : il disparaît à l'exécution.
// TODO 1 : ajoute une balise `kind` à chaque forme (et une forme Circle { kind: 'circle', radius }),
//          puis réécris `area` pour lire cette balise.
export interface Square {
  width: number;
}
export interface Rectangle extends Square {
  height: number;
}
export type Shape = Square | Rectangle;

export function area(shape: Shape): number {
  if (shape instanceof Rectangle) {
    return shape.width * shape.height;
  }
  return shape.width * shape.width;
}

// TODO 2 : `as number` ne convertit RIEN. Convertis vraiment ; une chaîne vide ou non numérique lève RangeError.
export function asNumber(val: number | string): number {
  return val as number;
}

// TODO 3 : `raw` vient de l'extérieur (réseau, formulaire) : le type boolean ne garantit rien ici.
// Accepte true/false, 'on'/'off' (casse libre, espaces ignorés) ; tout le reste lève TypeError.
export function parseSwitch(raw: unknown): boolean {
  throw new Error('TODO: valider raw à l’exécution');
}
