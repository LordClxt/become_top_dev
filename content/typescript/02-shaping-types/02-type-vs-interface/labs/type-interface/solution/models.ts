export interface Animal {
  name: string;
  legs: number;
}
export interface Dog extends Animal {
  breed: string;
}
export interface Cat extends Animal {
  indoor: boolean;
}
/** Une union : seul `type` sait l'exprimer. */
export type Pet = Dog | Cat;

/** Un tuple nommé : seul `type` sait l'exprimer aussi. */
export type Coord = [lat: number, lng: number];

export interface Settings {
  theme: 'light' | 'dark';
}
// Deuxième déclaration du même nom : les interfaces fusionnent (augmentation).
export interface Settings {
  fontSize: number;
}

export function defaultSettings(): Settings {
  return { theme: 'light', fontSize: 14 };
}

export function describePet(pet: Pet): string {
  if ('breed' in pet) return `${pet.name} (chien ${pet.breed}, ${pet.legs} pattes)`;
  return `${pet.name} (chat ${pet.indoor ? "d'intérieur" : "d'extérieur"}, ${pet.legs} pattes)`;
}

/** Distance euclidienne en degrés entre deux coordonnées. */
export function distance(a: Coord, b: Coord): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
