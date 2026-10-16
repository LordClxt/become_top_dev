export interface Square {
  kind: 'square';
  width: number;
}
export interface Rectangle {
  kind: 'rectangle';
  width: number;
  height: number;
}
export interface Circle {
  kind: 'circle';
  radius: number;
}
export type Shape = Square | Rectangle | Circle;

/** Aire d'une forme : la balise `kind` existe aussi à l'exécution, contrairement au type. */
export function area(shape: Shape): number {
  switch (shape.kind) {
    case 'square':
      return shape.width * shape.width;
    case 'rectangle':
      return shape.width * shape.height;
    case 'circle':
      return Math.PI * shape.radius ** 2;
  }
}

/** Normalise en nombre : `val as number` ne convertirait rien, il faut une vraie conversion. */
export function asNumber(val: number | string): number {
  const n = typeof val === 'number' ? val : Number(val.trim());
  if (val === '' || Number.isNaN(n)) throw new RangeError(`« ${val} » n'est pas un nombre`);
  return n;
}

/** Lit un interrupteur venu de l'extérieur : le type `boolean` n'existe plus à l'exécution. */
export function parseSwitch(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const text = raw.trim().toLowerCase();
    if (text === 'on') return true;
    if (text === 'off') return false;
  }
  throw new TypeError(`interrupteur invalide : ${JSON.stringify(raw)}`);
}
