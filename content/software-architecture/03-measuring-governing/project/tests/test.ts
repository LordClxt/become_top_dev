import { check, eq, raises, run, test } from './spec.ts';
import { cycleKey, cyclomatic, findCycles, ratchet, UnanalyzedModuleError, UnknownNodeError, type FlowGraph } from './governance.ts';

// ---------- Jalon 1 ----------

test('M1 une chaîne sans décision vaut 1', () => {
  eq(cyclomatic({ nodes: ['a', 'b', 'c'], edges: [['a', 'b'], ['b', 'c']] }), 1, 'CC d’une chaîne');
  eq(cyclomatic({ nodes: ['seul'], edges: [] }), 1, 'CC d’un nœud seul');
});

test('M1 la fonction decision du livre', () => {
  // entrée → test c1 ; si vrai → return 0 ; sinon → test c1 + c2 ; vrai → return 1 ; faux → return -1 ; tous → sortie
  const g: FlowGraph = {
    nodes: ['in', 'c1', 'r0', 'c2', 'r1', 'rm1', 'out'],
    edges: [['in', 'c1'], ['c1', 'r0'], ['c1', 'c2'], ['c2', 'r1'], ['c2', 'rm1'], ['r0', 'out'], ['r1', 'out'], ['rm1', 'out']],
  };
  eq(cyclomatic(g), 3, 'CC(decision)');
});

test('M1 une boucle ajoute un chemin', () => {
  const g: FlowGraph = { nodes: ['in', 'loop', 'body', 'out'], edges: [['in', 'loop'], ['loop', 'body'], ['body', 'loop'], ['loop', 'out']] };
  eq(cyclomatic(g), 2, 'CC d’une boucle while');
});

test('M1 plusieurs composantes : E − N + 2P', () => {
  const g: FlowGraph = {
    nodes: ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'b4'],
    edges: [['a1', 'a2'], ['a1', 'a3'], ['a2', 'a3'], ['b1', 'b2'], ['b2', 'b3'], ['b3', 'b4']],
  };
  eq(cyclomatic(g), 3, 'deux fonctions (CC 2 et CC 1) mesurées ensemble : 6 arêtes − 7 nœuds + 2 × 2 composantes');
});

test('M1 arête vers un nœud inconnu', async () => {
  await raises(() => cyclomatic({ nodes: ['a'], edges: [['a', 'b']] }), 'arête vers un nœud absent', UnknownNodeError);
});

// ---------- Jalon 2 ----------

test('M2 un graphe sans cycle', () => {
  eq(findCycles({ api: ['orders', 'money'], orders: ['money'], money: [] }), [], 'cycles');
});

test('M2 nommer les cycles', () => {
  const g = {
    orders: ['billing', 'catalog'],
    billing: ['loyalty'],
    loyalty: ['orders'],
    catalog: [],
    a: ['b'],
    b: ['a'],
    solo: ['solo'],
    lib: ['node:fs'],
  };
  eq(findCycles(g), [['a', 'b'], ['billing', 'loyalty', 'orders'], ['solo']],
    'cycles (composantes fortement connexes triées, auto-import compris, imports externes ignorés)');
});

test('M2 deux cycles imbriqués forment une seule composante', () => {
  eq(findCycles({ a: ['b'], b: ['c', 'a'], c: ['a'] }), [['a', 'b', 'c']], 'cycles');
});

test('M2 un import interne vers un module non analysé est une erreur', async () => {
  const g = { 'src/orders': ['src/billing'], 'src/billing': ['src/loyalty', 'node:crypto'] };
  eq(findCycles(g), [], 'sans préfixe interne, les imports inconnus sont ignorés (le piège de l’enquête)');
  const e = await raises(() => findCycles(g, { internalPrefix: 'src/' }), 'src/loyalty n’est pas analysé', UnanalyzedModuleError);
  check(e.message.includes('src/loyalty') && !e.message.includes('node:crypto'), `le message doit citer src/loyalty et seulement lui, obtenu « ${e.message} »`);
});

test('M2 une longue chaîne refermée', () => {
  const g: Record<string, string[]> = {};
  const n = 20000;
  for (let i = 0; i < n; i++) g[`m${i}`] = [`m${(i + 1) % n}`];
  const c = findCycles(g);
  eq([c.length, c[0]!.length], [1, n], '[nombre de cycles, taille] d’un anneau de 20 000 modules (pas de récursion qui déborde)');
});

// ---------- Jalon 3 ----------

test('M3 clé stable d’un cycle', () => {
  eq(cycleKey(['orders', 'billing', 'loyalty']), 'billing|loyalty|orders', 'cycleKey');
  eq(cycleKey(['b', 'a']), cycleKey(['a', 'b']), 'l’ordre ne compte pas');
});

test('M3 le cliquet refuse une violation nouvelle même si le total baisse', () => {
  const baseline = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const r = ratchet(['c4', 'c5', 'new'], baseline);
  eq(r.pass, false, 'pass');
  eq(r.added, ['new'], 'added');
  eq(r.fixed, ['c1', 'c2', 'c3'], 'fixed');
  eq(r.nextBaseline, baseline, 'en échec, la référence ne bouge pas');
});

test('M3 le cliquet se resserre', () => {
  const r = ratchet(['c4', 'c5'], ['c1', 'c2', 'c3', 'c4', 'c5']);
  eq([r.pass, r.added, r.fixed, r.nextBaseline], [true, [], ['c1', 'c2', 'c3'], ['c4', 'c5']], '[pass, added, fixed, nextBaseline]');
  eq(ratchet([], []).pass, true, 'aucune violation, aucune référence');
});

test('M3 de bout en bout : cycles + cliquet', () => {
  const before = { a: ['b'], b: ['a'], c: ['d'], d: ['c'] };
  const baseline = findCycles(before).map(cycleKey);
  const after = { a: ['b'], b: [], c: ['d'], d: ['c'], e: ['f'], f: ['e'] };
  const r = ratchet(findCycles(after).map(cycleKey), baseline);
  eq([r.pass, r.added, r.fixed], [false, ['e|f'], ['a|b']], '[pass, added, fixed]');
});

await run();
