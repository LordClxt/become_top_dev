export interface Animal {
  name: string;
  legs: number;
}

// Bug : cette interface redéclare `legs` avec un type incompatible. Lis l'erreur de TypeScript, corrige.
export interface Dog extends Animal {
  breed: string;
  legs: string;
}
export interface Cat extends Animal {
  indoor: boolean;
}

// TODO 1 : Pet est un chien OU un chat (une union s'écrit avec `type`).
export type Pet = never;

// TODO 2 : Coord est une paire nommée (lat, lng) de nombres.
export type Coord = never;

// TODO 3 : Settings doit avoir `theme: 'light' | 'dark'` ET `fontSize: number`,
// déclarés en DEUX interfaces du même nom (fusion). Ici deux `type` : c'est une erreur de doublon.
export type Settings = { theme: 'light' | 'dark' };
export type Settings = { fontSize: number };

export function defaultSettings(): Settings {
  throw new Error('TODO: { theme: "light", fontSize: 14 }');
}

export function describePet(pet: Pet): string {
  throw new Error('TODO: "Rex (chien Labrador, 4 pattes)" ou "Tom (chat d\'intérieur, 4 pattes)" (extérieur sinon)');
}

export function distance(a: Coord, b: Coord): number {
  throw new Error('TODO: distance euclidienne');
}
