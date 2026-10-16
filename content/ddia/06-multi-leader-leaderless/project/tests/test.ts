import { check, eq, raises, run, test } from './spec.ts';
import {
  Cluster, compare, inc, merge, mergeCarts, QuorumError, quorumOverlaps, Store, sum, type CartItem, type Order, type VV,
} from './leaderless.ts';

// ---------- Jalon 1 ----------

test('M1 compare', () => {
  const cases: [string, VV, VV, Order][] = [
    ['égaux', { A: 1, B: 2 }, { A: 1, B: 2 }, 'equal'],
    ['vides', {}, {}, 'equal'],
    ['avant', { A: 1 }, { A: 2, B: 1 }, 'before'],
    ['après', { A: 3, B: 1 }, { A: 2, B: 1 }, 'after'],
    ['concurrents', { A: 2 }, { B: 1 }, 'concurrent'],
    ['concurrents croisés', { A: 2, B: 1 }, { A: 1, B: 2 }, 'concurrent'],
    ['compteur absent = 0', {}, { A: 1 }, 'before'],
    ['absent des deux côtés', { A: 1, B: 0 }, { A: 1 }, 'equal'],
  ];
  for (const [name, a, b, want] of cases) eq(compare(a, b), want, `${name} : compare(${JSON.stringify(a)}, ${JSON.stringify(b)})`);
});

test('M1 compare est antisymétrique', () => {
  eq([compare({ A: 1 }, { A: 2 }), compare({ A: 2 }, { A: 1 })], ['before', 'after'], 'compare(a, b) et compare(b, a)');
});

test('M1 inc renvoie une copie', () => {
  const v: VV = { A: 1 };
  const w = inc(inc(v, 'A'), 'B');
  eq(v, { A: 1 }, 'inc ne doit pas modifier le vecteur d’origine');
  eq(w, { A: 2, B: 1 }, 'inc(inc(v, A), B)');
});

test('M1 lois de merge', () => {
  const a: VV = { A: 3, B: 1 }, b: VV = { A: 1, B: 4, C: 2 }, c: VV = { C: 5 };
  eq(merge(a, b), { A: 3, B: 4, C: 2 }, 'merge = le max compteur par compteur');
  eq(merge(a, b), merge(b, a), 'merge doit être commutatif');
  eq(merge(merge(a, b), c), merge(a, merge(b, c)), 'merge doit être associatif');
  eq(merge(a, a), a, 'merge doit être idempotent');
  check(merge(a, b) !== a, 'merge doit renvoyer un nouvel objet');
});

test('M1 le G-Counter converge', () => {
  const r1 = inc(inc({}, 'r1'), 'r1');
  const r2 = inc({}, 'r2');
  const r3 = inc(inc(inc({}, 'r3'), 'r3'), 'r3');
  const x = merge(merge(r1, r2), r3);
  const y = merge(r3, merge(r2, merge(r1, r2)));
  eq([sum(x), sum(y)], [6, 6], 'les réplicas convergent sur la même valeur, quel que soit l’ordre des échanges');
  eq(sum(merge(x, x)), 6, 'fusionner deux fois le même état ne change rien');
});

// ---------- Jalon 2 : le panier de la figure 5-13 ----------

test('M2 scénario du panier', () => {
  const s = new Store();
  eq(s.put('cart', '[milk]', 0), { values: ['[milk]'], version: 1 }, 'étape 1 : le client 1 ajoute du lait');
  eq(s.put('cart', '[eggs]', 0), { values: ['[milk]', '[eggs]'], version: 2 }, 'étape 2 : écriture concurrente (le lait doit rester)');
  eq(s.put('cart', '[milk,flour]', 1), { values: ['[eggs]', '[milk,flour]'], version: 3 }, 'étape 3 : écrase [milk] mais pas [eggs]');
  eq(s.put('cart', '[eggs,milk,ham]', 2), { values: ['[milk,flour]', '[eggs,milk,ham]'], version: 4 }, 'étape 4');
  eq(s.put('cart', '[milk,flour,eggs,bacon]', 3), { values: ['[eggs,milk,ham]', '[milk,flour,eggs,bacon]'], version: 5 }, 'étape 5');
  eq(s.get('cart').values.length, 2, 'deux siblings à la fin');
});

test('M2 fusionner avec la dernière version laisse une seule valeur', () => {
  const s = new Store();
  s.put('k', 'a', 0);
  s.put('k', 'b', 0);
  const { values, version } = s.get('k');
  eq(values.length, 2, 'deux écritures concurrentes');
  eq(s.put('k', 'a+b', version).values, ['a+b'], 'après fusion avec la dernière version');
});

test('M2 clé inconnue et clés indépendantes', () => {
  const s = new Store();
  eq(s.get('none'), { values: [], version: 0 }, 'clé inconnue');
  s.put('a', '1', 0);
  s.put('b', '2', 0);
  eq(s.get('a').version, 1, 'les versions sont par clé');
});

test('M2 mergeCarts garde les suppressions', () => {
  const s1: CartItem[] = [{ name: 'milk', removed: false }, { name: 'eggs', removed: false }];
  const s2: CartItem[] = [{ name: 'eggs', removed: true }, { name: 'ham', removed: false }];
  eq(mergeCarts(s1, s2), [{ name: 'eggs', removed: true }, { name: 'ham', removed: false }, { name: 'milk', removed: false }],
    'mergeCarts (union triée ; une suppression reste une suppression)');
  eq(mergeCarts(), [], 'aucun panier');
});

// ---------- Jalon 3 : le cluster à quorum ----------

test('M3 condition de quorum', () => {
  eq([quorumOverlaps(3, 2, 2), quorumOverlaps(5, 3, 3), quorumOverlaps(3, 3, 1)], [true, true, true], '(3,2,2), (5,3,3), (3,3,1)');
  eq([quorumOverlaps(3, 1, 1), quorumOverlaps(5, 2, 3)], [false, false], '(3,1,1) et (5,2,3) : w + r <= n');
});

test('M3 une écriture tolère un nœud en panne', async () => {
  const c = new Cluster(3, 2, 2);
  c.setDown(2, true);
  c.write('k', 'v1', 1); // 2 nœuds sur 3 suffisent pour w = 2
  eq(c.nodeVersion(2, 'k'), 0, 'le nœud en panne n’a pas reçu l’écriture');
  c.setDown(1, true);
  await raises(() => c.write('k', 'v2', 2), '1 nœud sur 3 ne suffit pas pour w = 2', QuorumError);
});

test('M3 la réparation à la lecture soigne un nœud en retard', () => {
  const c = new Cluster(3, 2, 2);
  c.setDown(2, true);
  c.write('k', 'v1', 1);
  c.setDown(2, false);
  eq(c.read('k', 1, 2), { value: 'v1', version: 1 }, 'read(k, 1, 2) — le nœud 1 est à jour');
  eq(c.nodeVersion(2, 'k'), 1, 'read repair : le nœud 2 consulté en retard doit être mis à jour');
});

test('M3 une lecture exige r réponses', async () => {
  const c = new Cluster(3, 2, 2);
  c.write('k', 'v', 1);
  await raises(() => c.read('k', 0), 'lire un seul nœud avec r = 2', QuorumError);
  c.setDown(0, true);
  await raises(() => c.read('k', 0, 1), 'un des deux nœuds consultés est en panne', QuorumError);
  eq(c.read('k').value, 'v', 'sans liste, on interroge tous les nœuds');
});

test('M3 un quorum faible lit des données périmées', () => {
  const c = new Cluster(5, 1, 1);
  c.setDown(4, true);
  c.write('k', 'new', 7);
  c.setDown(4, false);
  eq(c.read('k', 4), { value: '', version: 0 }, 'w = 1, r = 1 : lire le nœud 4 renvoie une donnée périmée');
  const strong = new Cluster(5, 3, 3);
  strong.setDown(4, true);
  strong.write('k', 'new', 7);
  strong.setDown(4, false);
  eq(strong.read('k', 4, 3, 2), { value: 'new', version: 7 }, 'w = 3, r = 3 : au moins un nœud lu est à jour');
});

test('M3 une écriture échouée n’est pas annulée', async () => {
  const c = new Cluster(3, 2, 2);
  c.setDown(1, true);
  c.setDown(2, true);
  await raises(() => c.write('k', 'ghost', 1), 'écriture sur un seul nœud', QuorumError);
  eq(c.nodeVersion(0, 'k'), 1, 'une écriture échouée n’est pas annulée sur les nœuds qui l’ont reçue');
  c.setDown(1, false);
  c.setDown(2, false);
  eq(c.read('k', 0, 1).value, 'ghost', 'une écriture « échouée » peut quand même apparaître');
});

test('M3 l’anti-entropie copie la plus récente', () => {
  const c = new Cluster(3, 2, 2);
  c.setDown(2, true);
  c.write('a', '1', 1);
  c.write('b', '2', 3);
  c.setDown(2, false);
  c.antiEntropy();
  eq([c.nodeVersion(2, 'a'), c.nodeVersion(2, 'b')], [1, 3], 'l’anti-entropie copie toutes les clés manquantes, même celles qu’on ne lit jamais');
  c.setDown(1, true);
  c.write('a', '1bis', 5);
  c.setDown(1, false);
  c.antiEntropy();
  eq(c.nodeVersion(1, 'a'), 5, 'l’anti-entropie propage la version la plus récente');
});

await run();
