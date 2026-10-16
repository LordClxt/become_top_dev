import type { Equals, Expect } from './expect.ts';
import { ageInYears, labels, longestWord, selectItem } from './inventory.ts';
import type { Item } from './inventory.ts';

export type Checks = [
  Expect<Equals<Item, { id: string; label: string }>>,
  Expect<Equals<Parameters<typeof ageInYears>, [birthYear: number, currentYear: number]>>,
  Expect<Equals<ReturnType<typeof ageInYears>, number>>,
  Expect<Equals<Parameters<typeof longestWord>[0], readonly string[]>>,
  Expect<Equals<ReturnType<typeof longestWord>, string | undefined>>,
  Expect<Equals<Parameters<typeof selectItem>, [items: readonly Item[], id: string]>>,
  Expect<Equals<ReturnType<typeof selectItem>, Item | undefined>>,
  Expect<Equals<Parameters<typeof labels>[0], readonly Item[]>>,
  Expect<Equals<ReturnType<typeof labels>, string[]>>,
];

const items: Item[] = [{ id: 'a', label: 'A' }];

// @ts-expect-error une chaîne '12' n'est pas un nombre
ageInYears('12', 2024);
// @ts-expect-error on passe l'identifiant, pas l'objet entier
selectItem(items, items[0]);
// @ts-expect-error une liste de nombres n'est pas une liste de mots
longestWord([1, 2, 3]);
