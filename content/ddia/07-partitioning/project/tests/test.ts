import { check, eq, run, test } from './spec.ts';
import {
  addNode, allSalted, assign, balanced, GlobalIndexStore, hash, hashPartition, load, LocalIndexStore, modNPartition,
  movedFraction, RangePartitioner, removeNode, Router, saltedKey, type Doc, type IndexedStore, type RoutingTable,
} from './partitioning.ts';

const keys = (n: number) => Array.from({ length: n }, (_, i) => `user-${i}`);
const loadObj = (a: ReadonlyMap<number, string>) => Object.fromEntries([...load(a)].sort());

// ---------- Jalon 1 ----------

test('M1 hashPartition est stable et dans l’intervalle', () => {
  for (const k of keys(500)) {
    const p = hashPartition(k, 8);
    check(p >= 0 && p < 8 && Number.isInteger(p), `hashPartition("${k}", 8) = ${p}, hors de [0, 8[`);
    eq(hashPartition(k, 8), p, 'la partition d’une clé doit être stable');
  }
  eq(hashPartition('x', 1), 0, 'avec une seule partition, tout va à la partition 0');
});

test('M1 hashPartition répartit uniformément', () => {
  const count = new Array<number>(8).fill(0);
  for (const k of keys(8000)) count[hashPartition(k, 8)]!++;
  check(count.every((c) => c >= 800 && c <= 1200), `clés par partition : ${count} ; attendu environ 1000 chacune (un bon hachage répartit uniformément)`);
});

test('M1 hashPartition garde l’ordre des hachages', () => {
  const ks = keys(2000).sort((a, b) => hash(a) - hash(b));
  let last = 0;
  for (const k of ks) {
    const p = hashPartition(k, 16);
    check(p >= last, `la partition de "${k}" (${p}) est inférieure à celle d'un hachage plus petit (${last}) : il faut découper l'espace des hachages en tranches contiguës`);
    last = p;
  }
});

test('M1 locate', () => {
  const r = new RangePartitioner(['c', 'm', 't']); // [..c[ [c..m[ [m..t[ [t..]
  eq(r.partitions, 4, 'partitions');
  const cases: [string, number][] = [['a', 0], ['b', 0], ['c', 1], ['lzzz', 1], ['m', 2], ['s', 2], ['t', 3], ['zebra', 3], ['', 0]];
  for (const [k, want] of cases) eq(r.locate(k), want, `locate("${k}") — une borne appartient à la partition qu’elle ouvre`);
});

test('M1 rangeQuery ne touche que les partitions utiles', () => {
  const r = new RangePartitioner(['c', 'm', 't']);
  eq(r.rangeQuery('d', 'k'), [1], 'rangeQuery(d, k) : une plage dans une partition n’en touche qu’une');
  eq(r.rangeQuery('b', 'n'), [0, 1, 2], 'rangeQuery(b, n)');
});

test('M1 hot spot des clés horodatées, et sa correction', () => {
  const r = new RangePartitioner(['2026-10-02', '2026-10-03', '2026-10-04']);
  const hot = new Set(Array.from({ length: 24 }, (_, h) => r.locate(`2026-10-03T${String(h).padStart(2, '0')}:00`)));
  eq(hot.size, 1, 'les écritures d’un même jour vont toutes à une partition (le hot spot)');
  const byName = new RangePartitioner(['capteur-25', 'capteur-50', 'capteur-75']);
  const spread = new Set(Array.from({ length: 100 }, (_, s) => byName.locate(`capteur-${String(s).padStart(2, '0')}|2026-10-03T10:00`)));
  eq(spread.size, 4, 'avec le capteur en tête de clé, les écritures simultanées touchent 4 partitions');
});

test('M1 le sel répartit une clé chaude', () => {
  const salted = allSalted('celebrity', 100);
  eq([salted.length, salted[0], salted[99]], [100, 'celebrity#00', 'celebrity#99'], 'allSalted');
  eq(saltedKey('celebrity', 7), 'celebrity#07', 'saltedKey');
  const parts = new Set(salted.map((k) => hashPartition(k, 8)));
  check(parts.size >= 6, `100 sous-clés ne touchent que ${parts.size} partitions sur 8 : le sel doit répartir les écritures`);
});

// ---------- Jalon 2 ----------

const nodeIndex = (n: string) => Number(n.slice(1));

test('M2 hash mod N déplace presque tout', () => {
  const moved = movedFraction(keys(10000), (k) => modNPartition(k, 10), (k) => modNPartition(k, 11));
  check(moved >= 0.85, `hash mod N : ${(moved * 100).toFixed(0)} % des clés déplacées en passant de 10 à 11 nœuds ; attendu plus de 85 %`);
  eq(movedFraction([], () => 0, () => 0), 0, 'aucune clé');
});

test('M2 des partitions fixes déplacent peu de clés', () => {
  const nodes = Array.from({ length: 10 }, (_, i) => `n${String(i + 1).padStart(2, '0')}`);
  const before = assign(100, nodes);
  const { assignment: after, moved } = addNode(before, 'n11');
  eq(moved, 9, 'partitions déplacées (100 ÷ 11, arrondi inférieur)');
  const f = movedFraction(keys(10000), (k) => nodeIndex(before.get(hashPartition(k, 100))!), (k) => nodeIndex(after.get(hashPartition(k, 100))!));
  check(f <= 0.15, `partitions fixes : ${(f * 100).toFixed(0)} % des clés déplacées, attendu moins de 15 %`);
});

test('M2 assign équilibre', () => {
  const a = assign(12, ['A', 'B', 'C']);
  eq(loadObj(a), { A: 4, B: 4, C: 4 }, '12 partitions sur 3 nœuds');
  check(balanced(a), '12 partitions sur 3 nœuds sont équilibrées');
  eq([a.get(0), a.get(1), a.get(3)], ['A', 'B', 'A'], 'la partition i va au nœud i mod nodes.length');
  check(balanced(assign(10, ['A', 'B', 'C'])), '10 partitions sur 3 nœuds : 4, 3, 3 est équilibré');
});

test('M2 addNode vole des partitions entières', () => {
  const a = assign(12, ['A', 'B', 'C']);
  const { assignment: b, moved } = addNode(a, 'D');
  eq([moved, loadObj(b)], [3, { A: 3, B: 3, C: 3, D: 3 }], 'addNode : partitions déplacées et charges');
  let changed = 0;
  for (const [p, owner] of a) {
    if (owner === b.get(p)) continue;
    changed++;
    eq(b.get(p), 'D', `la partition ${p} a changé de ${owner} : seul le nouveau nœud doit recevoir des partitions`);
  }
  eq(changed, 3, 'partitions qui ont changé de propriétaire (le minimum)');
  eq(load(a).get('D'), undefined, 'addNode ne doit pas modifier l’affectation d’origine');
});

test('M2 addNode garde l’équilibre quand c’est inégal', () => {
  const { assignment: b, moved } = addNode(assign(10, ['A', 'B', 'C']), 'D');
  eq(moved, 2, '10 partitions, 3 puis 4 nœuds : partitions déplacées');
  check(balanced(b), `charges ${JSON.stringify(loadObj(b))} : doit rester équilibré`);
});

test('M2 removeNode redistribue', () => {
  const a = assign(12, ['A', 'B', 'C', 'D']);
  const { assignment: b, moved } = removeNode(a, 'D');
  eq([moved, load(b).size, balanced(b)], [3, 3, true], 'removeNode : déplacées, nœuds restants, équilibre');
  for (const [p, owner] of a) {
    if (owner !== 'D') eq(b.get(p), owner, `la partition ${p} n'appartenait pas à D : elle ne doit pas bouger`);
    check(b.get(p) !== 'D', `la partition ${p} est encore à D`);
  }
});

// ---------- Jalon 3 ----------

const cars: Doc[] = [
  { id: 'c1', fields: { color: 'red', make: 'Ford' } },
  { id: 'c2', fields: { color: 'blue', make: 'Fiat' } },
  { id: 'c3', fields: { color: 'red', make: 'Fiat' } },
  { id: 'c4', fields: { color: 'red', make: 'Opel' } },
  { id: 'c5', fields: { color: 'green', make: 'Ford' } },
  { id: 'c6', fields: { color: 'blue', make: 'Opel' } },
];

test('M3 les deux index trouvent les mêmes voitures', () => {
  const stores: [string, IndexedStore][] = [['local', new LocalIndexStore(4)], ['global', new GlobalIndexStore(4)]];
  for (const [name, s] of stores) {
    for (const d of cars) s.put(d);
    eq(s.query('color', 'red').ids, ['c1', 'c3', 'c4'], `${name} : color=red`);
    eq(s.query('color', 'pink').ids, [], `${name} : terme inconnu`);
    eq(s.query('make', 'Opel').ids, ['c4', 'c6'], `${name} : make=Opel`);
  }
});

test('M3 l’index local : lecture éclatée, écriture sur une partition', () => {
  const s = new LocalIndexStore(4);
  eq(s.put(cars[0]!), 1, 'partitions touchées par put sur un index local');
  eq(s.query('color', 'red').touched, 4, 'partitions interrogées par query sur un index local (scatter/gather)');
});

test('M3 l’index global : lecture sur une partition, écriture sur plusieurs', () => {
  const s = new GlobalIndexStore(8);
  eq(s.query('color', 'red').touched, 1, 'partitions interrogées par query sur un index global');
  const d: Doc = { id: 'x', fields: { color: 'red', make: 'Ford', year: '2019', fuel: 'diesel' } };
  const distinct = new Set(Object.entries(d.fields).map(([f, v]) => hashPartition(`${f}:${v}`, 8)));
  eq(s.put(d), 1 + distinct.size, `put sur un index global (la partition du document + ${distinct.size} partitions d’index distinctes)`);
  check(distinct.size >= 2, 'test mal calibré');
});

test('M3 le routeur n’accepte que des tables plus récentes', () => {
  const r = new Router(4);
  eq(r.nodeFor('k'), undefined, 'sans table, pas de routage');
  const v1: RoutingTable = { version: 1, owner: new Map([[0, 'A'], [1, 'A'], [2, 'B'], [3, 'B']]) };
  const v2: RoutingTable = { version: 2, owner: new Map([[0, 'A'], [1, 'C'], [2, 'B'], [3, 'C']]) };
  eq(r.update(v1), true, 'la première table doit être acceptée');
  const k = 'user-1', p = hashPartition(k, 4);
  eq(r.nodeFor(k), v1.owner.get(p), 'nodeFor avec v1');
  eq(r.update(v2), true, 'une table plus récente doit être acceptée');
  eq(r.update(v1), false, 'une table plus ancienne doit être refusée (elle renverrait vers d’anciens propriétaires)');
  eq(r.update(v2), false, 'la même version n’apporte rien : refusée');
  eq(r.nodeFor(k), v2.owner.get(p), 'après v2 puis v1 refusée');
});

await run();
