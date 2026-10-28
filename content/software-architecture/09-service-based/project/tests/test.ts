import { check, eq, raises, run, test } from './spec.ts';
import {
  AmbiguousTableError, averageImpact, Db, NestedTransactionError, OrderFacade, OutOfStockError, PaymentDeclinedError,
  redeployImpact, UnknownTableError, type Charge,
} from './servicebased.ts';

// ---------- Jalon 1 ----------

test('M1 commit : les écritures deviennent visibles', () => {
  const db = new Db();
  const r = db.transaction((tx) => {
    tx.put('stock', 'sku-1', { qty: 3 });
    eq(tx.get('stock', 'sku-1'), { qty: 3 }, 'la transaction lit ses propres écritures');
    eq(db.get('stock', 'sku-1'), undefined, 'avant le commit, rien n’est visible hors de la transaction');
    return 'ok';
  });
  eq([r, db.get('stock', 'sku-1'), db.count('stock')], ['ok', { qty: 3 }, 1], '[résultat, ligne, nombre de lignes] après commit');
});

test('M1 rollback : une exception annule tout, séquences comprises', async () => {
  const db = new Db();
  db.transaction((tx) => { tx.put('stock', 'sku-1', { qty: 3 }); tx.nextId('orders'); });
  await raises(() => db.transaction((tx) => {
    tx.put('stock', 'sku-1', { qty: 0 });
    tx.delete('stock', 'sku-1');
    tx.put('orders', 'o', { x: 1 });
    eq(tx.nextId('orders'), 2, 'séquence dans la transaction');
    throw new Error('panne');
  }), 'transaction qui échoue', Error);
  eq([db.get('stock', 'sku-1'), db.count('orders')], [{ qty: 3 }, 0], 'état inchangé après rollback');
  eq(db.transaction((tx) => tx.nextId('orders')), 2, 'la séquence annulée est réutilisée');
});

test('M1 suppression, lecture de table, copies', () => {
  const db = new Db();
  db.transaction((tx) => { tx.put('t', 'b', { v: 2 }); tx.put('t', 'a', { v: 1 }); tx.put('t', 'c', { v: 3 }); });
  const rows = db.transaction((tx) => { tx.delete('t', 'b'); tx.put('t', 'd', { v: 4 }); return tx.all('t'); });
  eq(rows, [['a', { v: 1 }], ['c', { v: 3 }], ['d', { v: 4 }]], 'all() voit les écritures de la transaction, trié par id');
  const row = db.get('t', 'a')!;
  row.v = 99;
  eq(db.get('t', 'a'), { v: 1 }, 'modifier une ligne lue ne modifie pas la base');
});

test('M1 transactions imbriquées refusées', async () => {
  const db = new Db();
  await raises(() => db.transaction(() => db.transaction(() => 1)), 'transaction imbriquée', NestedTransactionError);
  eq(db.transaction(() => 'ok'), 'ok', 'une transaction est possible après le refus');
});

// ---------- Jalon 2 ----------

function setup(charge: Charge) {
  const db = new Db();
  db.transaction((tx) => { tx.put('stock', 'mug', { qty: 2 }); tx.put('stock', 'tee', { qty: 5 }); });
  return { db, facade: new OrderFacade(db, charge) };
}
const okCharge: Charge = (_card, amount) => `PAY-${amount}`;

test('M2 commande réussie', () => {
  const { db, facade } = setup(okCharge);
  const id = facade.placeOrder({ customerId: 'c1', card: '4242', lines: [{ sku: 'mug', qty: 2, priceCents: 1200 }, { sku: 'tee', qty: 1, priceCents: 2000 }] });
  eq(id, 'ORD-1', 'identifiant');
  eq([db.get('stock', 'mug'), db.get('stock', 'tee')], [{ qty: 0 }, { qty: 4 }], 'stock décrémenté');
  eq(db.get('payments', 'ORD-1'), { ref: 'PAY-4400', amountCents: 4400 }, 'paiement enregistré');
  eq((db.get('orders', 'ORD-1') as { totalCents: number }).totalCents, 4400, 'total de la commande');
});

test('M2 carte expirée : rien ne bouge', async () => {
  const { db, facade } = setup(() => { throw new PaymentDeclinedError('carte expirée'); });
  await raises(() => facade.placeOrder({ customerId: 'c1', card: '0000', lines: [{ sku: 'mug', qty: 1, priceCents: 1200 }] }), 'paiement refusé', PaymentDeclinedError);
  eq([db.get('stock', 'mug'), db.count('orders'), db.count('payments')], [{ qty: 2 }, 0, 0], 'ni stock perdu, ni commande fantôme');
  const ok = new OrderFacade(db, okCharge);
  eq(ok.placeOrder({ customerId: 'c2', card: '4242', lines: [{ sku: 'mug', qty: 1, priceCents: 1200 }] }), 'ORD-1', 'le numéro ORD-1 n’a pas été consommé par l’échec');
});

test('M2 stock insuffisant : le client n’est jamais débité', async () => {
  let charged = 0;
  const { db, facade } = setup(() => { charged++; return 'PAY'; });
  await raises(() => facade.placeOrder({ customerId: 'c1', card: '4242', lines: [{ sku: 'tee', qty: 1, priceCents: 2000 }, { sku: 'mug', qty: 3, priceCents: 1200 }] }), 'stock insuffisant', OutOfStockError);
  eq([charged, db.get('stock', 'tee'), db.count('orders')], [0, { qty: 5 }, 0], '[débits, stock du tee, commandes]');
  await raises(() => facade.placeOrder({ customerId: 'c1', card: '4242', lines: [{ sku: 'ghost', qty: 1, priceCents: 1 }] }), 'article inconnu', OutOfStockError);
});

// ---------- Jalon 3 ----------

const libs = {
  common: ['customers', 'devices'],
  quoting: ['quotes'],
  assessment: ['assessments', 'rules'],
  accounting: ['payments'],
  tracking: ['status_events'],
};
const services = {
  quoting: ['common', 'quoting'],
  receiving: ['common', 'tracking'],
  assessment: ['common', 'assessment'],
  accounting: ['common', 'accounting'],
  'item-status': ['common', 'tracking'],
  recycling: ['common', 'assessment'],
  reporting: ['common', 'quoting', 'assessment', 'accounting'],
};

test('M3 impact d’un changement de table', () => {
  eq(redeployImpact(['rules'], libs, services), ['assessment', 'recycling', 'reporting'], 'rules');
  eq(redeployImpact(['status_events'], libs, services), ['item-status', 'receiving'], 'status_events');
  eq(redeployImpact(['customers'], libs, services).length, 7, 'une table commune redéploie tout');
  eq(redeployImpact(['quotes', 'payments'], libs, services), ['accounting', 'quoting', 'reporting'], 'deux tables');
  eq(redeployImpact([], libs, services), [], 'aucun changement');
});

test('M3 tables mal rangées', async () => {
  await raises(() => redeployImpact(['ghost'], libs, services), 'table sans bibliothèque', UnknownTableError);
  await raises(() => redeployImpact(['quotes'], { ...libs, extra: ['quotes'] }, services), 'table dans deux bibliothèques', AmbiguousTableError);
});

test('M3 bibliothèque unique contre bibliothèques fédérées', () => {
  const single = { all: Object.values(libs).flat() };
  const singleServices = Object.fromEntries(Object.keys(services).map((s) => [s, ['all']]));
  eq(averageImpact(single, singleServices), 7, 'bibliothèque unique : chaque changement redéploie les 7 services');
  const fed = averageImpact(libs, services);
  eq(fed, 3.71, 'bibliothèques fédérées : impact moyen par table ((7 + 7 + 2 + 3 + 3 + 2 + 2) / 7)');
  check(fed < 7, 'le fédéré doit réduire l’impact moyen');
});

await run();
