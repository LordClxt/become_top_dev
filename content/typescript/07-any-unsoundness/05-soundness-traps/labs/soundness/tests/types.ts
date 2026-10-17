import type { Equals, Expect } from './expect.ts';
import { nth } from './farm.ts';
import type { Feeder, Hen } from './farm.ts';

const x = nth([1, 2, 3], 5);
export type Checks = [Expect<Equals<typeof x, number | undefined>>];

const picky = (animal: Hen) => animal.cluck();
// @ts-expect-error un nourrisseur de poules ne peut pas nourrir n'importe quel animal
export const feeder: Feeder = { feed: picky };
