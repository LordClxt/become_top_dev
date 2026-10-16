import { check, eq, raises, run, test } from './spec.ts';
import { addItem, applyPatch, compose, lowStock, totalValue, withoutEmpty } from './inventory.ts';
import type { Inventory } from './inventory.ts';

const empty: Inventory = new Map();
const base = addItem(addItem(empty, { sku: 'b-2', name: 'Boulon', qty: 10, price: 0.25 }), { sku: 'a-1', name: 'Vis', qty: 0, price: 0.1 });

test('addItem : renvoie un nouvel inventaire sans toucher l’ancien', () => {
  eq(empty.size, 0, 'l’inventaire vide ne doit pas changer');
  eq(base.size, 2, 'taille après deux ajouts');
  const item = { sku: 'c-3', name: 'Écrou', qty: 5, price: 1 };
  const withC = addItem(base, item);
  item.qty = 999;
  eq(withC.get('c-3')?.qty, 5, 'l’article ajouté est une copie');
  eq(base.has('c-3'), false, 'base inchangé');
});

test('addItem : sku en double', async () => {
  await raises(() => addItem(base, { sku: 'b-2', name: 'x', qty: 1, price: 1 }), 'sku en double', Error);
});

test('applyPatch', async () => {
  const patched = applyPatch(base, 'b-2', { qty: 7, price: 0.5 });
  eq(patched.get('b-2'), { sku: 'b-2', name: 'Boulon', qty: 7, price: 0.5 }, 'article modifié');
  eq(base.get('b-2')?.qty, 10, 'l’original ne change pas');
  await raises(() => applyPatch(base, 'zzz', { qty: 1 }), 'sku inconnu', Error);
});

test('totalValue : arrondi au centime', () => {
  eq(totalValue(base), 2.5, 'totalValue(base)');
  eq(totalValue(empty), 0, 'totalValue(vide)');
  eq(totalValue(addItem(empty, { sku: 'x', name: 'x', qty: 3, price: 0.1 })), 0.3, '3 × 0.1');
});

test('lowStock : strictement inférieur, trié par sku', () => {
  const inv = addItem(addItem(base, { sku: 'c-3', name: 'Écrou', qty: 2, price: 1 }), { sku: 'd-4', name: 'Clou', qty: 3, price: 1 });
  eq(lowStock(inv, 3).map((i) => i.sku), ['a-1', 'c-3'], 'lowStock(inv, 3)');
  eq(lowStock(inv, 0), [], 'lowStock(inv, 0)');
});

test('withoutEmpty et compose', () => {
  eq([...withoutEmpty(base).keys()], ['b-2'], 'withoutEmpty(base)');
  const raise = (inventory: Inventory) => applyPatch(inventory, 'b-2', { price: 1 });
  const pipeline = compose(raise, withoutEmpty);
  const result = pipeline(base);
  eq([...result.keys()], ['b-2'], 'clés après compose');
  eq(result.get('b-2')?.price, 1, 'prix après compose');
  check(base.has('a-1'), 'base ne doit pas avoir changé');
  eq(compose()(base), base, 'compose() est l’identité');
});

await run();
