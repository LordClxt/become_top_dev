import { eq, raises, run, test } from './spec.ts';
import { analyze, findQuanta, settle, UnknownComponentError, type Component, type Link } from './quanta.ts';

const c = (id: string, kind: Component['kind'], needs?: Component['needs']): Component => ({ id, kind, ...(needs ? { needs } : {}) });

// ---------- Jalon 1 ----------

test('M1 un monolithe et sa base : un quantum', () => {
  eq(findQuanta([c('app', 'service'), c('db', 'database')], [{ from: 'app', to: 'db', kind: 'data' }]), [['app', 'db']], 'quanta');
});

test('M1 base partagée et interface partagée', () => {
  const comps = [c('ui', 'ui'), c('a', 'service'), c('b', 'service'), c('c', 'service'), c('da', 'database'), c('db', 'database'), c('dc', 'database')];
  const ownDbs: Link[] = [{ from: 'a', to: 'da', kind: 'data' }, { from: 'b', to: 'db', kind: 'data' }, { from: 'c', to: 'dc', kind: 'data' }];
  eq(findQuanta(comps, ownDbs).length, 4, 'sans interface reliée : ui seule + 3 services avec leur base');
  const viaUi: Link[] = [...ownDbs, { from: 'ui', to: 'a', kind: 'sync' }, { from: 'ui', to: 'b', kind: 'sync' }, { from: 'ui', to: 'c', kind: 'sync' }];
  eq(findQuanta(comps, viaUi), [['a', 'b', 'c', 'da', 'db', 'dc', 'ui']], 'une interface unique qui appelle tout en synchrone soude tout');
});

test('M1 l’asynchrone et les files ne lient pas', () => {
  const comps = [c('auction', 'service'), c('adb', 'database'), c('q', 'queue'), c('payment', 'service'), c('pdb', 'database')];
  const links: Link[] = [
    { from: 'auction', to: 'adb', kind: 'data' },
    { from: 'auction', to: 'q', kind: 'async' },
    { from: 'q', to: 'payment', kind: 'async' },
    { from: 'payment', to: 'pdb', kind: 'data' },
  ];
  eq(findQuanta(comps, links), [['adb', 'auction'], ['payment', 'pdb']], 'quanta (la file n’appartient à aucun)');
  eq(findQuanta(comps, [...links, { from: 'auction', to: 'payment', kind: 'sync' }]).length, 1, 'avec un appel synchrone en plus');
  eq(findQuanta(comps, links.map((l) => (l.to === 'q' ? { ...l, kind: 'sync' as const } : l))).length, 2,
    'un lien marqué synchrone vers une file ne soude rien : la file est de l’infrastructure');
});

test('M1 composant inconnu', async () => {
  await raises(() => findQuanta([c('a', 'service')], [{ from: 'a', to: 'ghost', kind: 'sync' }]), 'lien vers un composant absent', UnknownComponentError);
});

// ---------- Jalon 2 ----------

const ggg = (): { comps: Component[]; links: Link[] } => ({
  comps: [
    c('bidder-ui', 'ui', { elasticity: 3 }),
    c('bid-capture', 'service', { elasticity: 3, scalability: 3 }),
    c('tracker', 'service', { availability: 3 }),
    c('tracker-db', 'database'),
    c('q', 'queue'),
    c('payment', 'service', { scalability: 1 }),
  ],
  links: [
    { from: 'bidder-ui', to: 'bid-capture', kind: 'sync' },
    { from: 'bid-capture', to: 'tracker', kind: 'sync' },
    { from: 'tracker', to: 'tracker-db', kind: 'data' },
    { from: 'tracker', to: 'q', kind: 'async' },
    { from: 'q', to: 'payment', kind: 'async' },
  ],
});

test('M2 profil de chaque quantum', () => {
  const { comps, links } = ggg();
  const r = analyze(comps, links);
  eq(r.quanta.map((q) => q.members), [['bid-capture', 'bidder-ui', 'tracker', 'tracker-db'], ['payment']], 'membres');
  eq(r.quanta[0]!.needs, { elasticity: 3, scalability: 3, availability: 3 }, 'besoins du premier quantum (maximum par caractéristique)');
  eq(r.quanta[1]!.needs, { scalability: 1 }, 'besoins du quantum paiement');
});

test('M2 un appel synchrone vers moins exigeant est signalé', () => {
  const { comps, links } = ggg();
  eq(analyze(comps, links).mismatches, [
    { from: 'bid-capture', to: 'tracker', characteristic: 'elasticity', caller: 3, callee: 1 },
    { from: 'bid-capture', to: 'tracker', characteristic: 'scalability', caller: 3, callee: 1 },
  ], 'mismatches (seuls les liens synchrones comptent ; un besoin absent vaut 1)');
});

test('M2 passer en asynchrone fait disparaître le décalage', () => {
  const { comps, links } = ggg();
  const fixed = links.map((l) => (l.from === 'bid-capture' ? { ...l, kind: 'async' as const } : l));
  const r = analyze(comps, fixed);
  eq([r.quanta.length, r.mismatches], [3, []], '[nombre de quanta, mismatches]');
});

// ---------- Jalon 3 ----------

const burst = () => Array(40).fill(0);

test('M3 synchrone : la rafale expire', () => {
  eq(settle(burst(), 500, { sync: { timeoutMs: 3000 } }), { succeeded: 6, failed: 34, lastCompletionMs: 3000, maxWaitMs: 2500 }, 'résultat');
});

test('M3 asynchrone : la file absorbe', () => {
  eq(settle(burst(), 500, { async: { maxQueue: 1000 } }), { succeeded: 40, failed: 0, lastCompletionMs: 20000, maxWaitMs: 19500 }, 'file assez grande');
  eq(settle(burst(), 500, { async: { maxQueue: 10 } }), { succeeded: 11, failed: 29, lastCompletionMs: 5500, maxWaitMs: 5000 },
    'file de 10 : une requête en cours + 10 en attente');
});

test('M3 une requête expirée ne consomme pas de capacité', () => {
  eq(settle([0, 0, 100, 5000], 1000, { sync: { timeoutMs: 1500 } }), { succeeded: 2, failed: 2, lastCompletionMs: 6000, maxWaitMs: 0 }, 'résultat');
  const spread = Array.from({ length: 20 }, (_, i) => i * 400);
  eq(settle(spread, 500, { sync: { timeoutMs: 1500 } }), { succeeded: 18, failed: 2, lastCompletionMs: 9000, maxWaitMs: 1000 },
    'arrivées toutes les 400 ms pour un service de 500 ms');
});

test('M3 arrivées non triées et cas vides', () => {
  eq(settle([1000, 0], 100, { sync: { timeoutMs: 500 } }).succeeded, 2, 'les arrivées sont traitées dans l’ordre chronologique');
  eq(settle([], 100, { async: { maxQueue: 1 } }), { succeeded: 0, failed: 0, lastCompletionMs: 0, maxWaitMs: 0 }, 'aucune requête');
});

await run();
