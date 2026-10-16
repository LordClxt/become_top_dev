import type { Equals, Expect } from './expect.ts';
import type { Animal, Cat, Coord, Dog, Pet, Settings } from './models.ts';
import { defaultSettings } from './models.ts';

export type Checks = [
  Expect<Equals<Dog['legs'], number>>,
  Expect<Equals<Pet, Dog | Cat>>,
  Expect<Equals<Coord, [lat: number, lng: number]>>,
  Expect<Equals<keyof Settings, 'theme' | 'fontSize'>>,
  Expect<Equals<Settings['theme'], 'light' | 'dark'>>,
  Expect<Equals<keyof Dog, keyof Animal | 'breed'>>,
];

export const s: Settings = defaultSettings();
// @ts-expect-error il manque fontSize : les deux déclarations sont fusionnées
export const incomplete: Settings = { theme: 'dark' };
// @ts-expect-error un Coord est une paire, pas un triplet
export const triple: Coord = [1, 2, 3];
