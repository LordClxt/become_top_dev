import type { Equals, Expect } from './expect.ts';
import { addItem, applyPatch, compose, lowStock, totalValue, withoutEmpty } from './inventory.ts';
import type { Inventory, Item, ItemPatch, Transform } from './inventory.ts';

export type Checks = [
  Expect<Equals<Inventory, ReadonlyMap<string, Readonly<Item>>>>,
  Expect<Equals<ItemPatch, { name?: string; qty?: number; price?: number }>>,
  Expect<Equals<Transform, (inventory: Inventory) => Inventory>>,
  Expect<Equals<typeof withoutEmpty, Transform>>,
  Expect<Equals<ReturnType<typeof compose>, Transform>>,
  Expect<Equals<Parameters<typeof addItem>[0], Inventory>>,
];

const item: Item = { sku: 'a', name: 'A', qty: 1, price: 1 };
// @ts-expect-error le sku est en lecture seule
item.sku = 'b';
declare const inv: Inventory;
// @ts-expect-error un inventaire est en lecture seule : pas de set
inv.set('a', item);
// @ts-expect-error on ne peut pas patcher le sku
applyPatch(inv, 'a', { sku: 'z' });
// @ts-expect-error qty est un nombre
applyPatch(inv, 'a', { qty: '3' });
