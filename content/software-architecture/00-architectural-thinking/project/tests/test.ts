import { check, eq, raises, run, test } from './spec.ts';
import { checkLayers, InvalidVarianceError, layerOf, type Graph, type Layer, type Rules } from './layers.ts';

// L'architecture de référence : celle du backend de cette plateforme.
const layers = (): Layer[] => [
  { name: 'api', prefix: 'src/api/' },
  { name: 'service', prefix: 'src/service/' },
  { name: 'repository', prefix: 'src/repository/' },
  { name: 'model', prefix: 'src/model/' },
];
const pairs = (r: { violations: { from: string; to: string; kind: string }[] }) =>
  r.violations.map((v) => `${v.kind}:${v.from}>${v.to}`);

// ---------- Jalon 1 ----------

test('M1 layerOf prend le préfixe le plus long', () => {
  const ls: Layer[] = [
    { name: 'app', prefix: 'src/' },
    { name: 'api', prefix: 'src/api/' },
  ];
  eq(layerOf('src/api/orders.ts', ls)?.name, 'api', "layerOf('src/api/orders.ts')");
  eq(layerOf('src/main.ts', ls)?.name, 'app', "layerOf('src/main.ts')");
  eq(layerOf('scripts/seed.ts', ls), undefined, 'un module hors de tout préfixe');
});

test('M1 une architecture saine ne signale rien', () => {
  const g: Graph = {
    'src/api/orders.ts': ['src/service/orders.ts', 'src/api/http.ts'],
    'src/api/http.ts': [],
    'src/service/orders.ts': ['src/repository/orders.ts'],
    'src/repository/orders.ts': ['src/model/order.ts'],
    'src/model/order.ts': [],
  };
  const r = checkLayers(g, { layers: layers() });
  eq(pairs(r), [], 'violations (même couche et couche juste en dessous sont permises)');
  eq([r.waived, r.unusedVariances], [[], []], 'waived et unusedVariances');
});

test('M1 dépendance vers le haut', () => {
  const g: Graph = {
    'src/service/orders.ts': ['src/api/dto.ts', 'src/repository/orders.ts'],
    'src/model/order.ts': ['src/service/pricing.ts'],
  };
  const r = checkLayers(g, { layers: layers() });
  eq(pairs(r), ['upward:src/model/order.ts>src/service/pricing.ts', 'upward:src/service/orders.ts>src/api/dto.ts'],
    'violations, triées par module source puis cible');
  const msg = r.violations[1]!.message;
  check(msg.includes('service') && msg.includes('api'), `le message doit citer les deux couches, obtenu « ${msg} »`);
});

test('M1 module hors couche', () => {
  const g: Graph = { 'src/api/orders.ts': ['lib/legacy.ts'] };
  const r = checkLayers(g, { layers: layers() });
  eq(pairs(r), ['unknown-layer:src/api/orders.ts>lib/legacy.ts'], 'violations');
  check(r.violations[0]!.message.includes('lib/legacy.ts'), 'le message doit citer le module sans couche');
});

test('M1 imports en double comptés une fois', () => {
  const g: Graph = { 'src/model/a.ts': ['src/api/x.ts', 'src/api/x.ts'] };
  eq(pairs(checkLayers(g, { layers: layers() })).length, 1, 'nombre de violations');
});

// ---------- Jalon 2 ----------

test('M2 sauter une couche fermée est interdit', () => {
  const g: Graph = { 'src/api/orders.ts': ['src/repository/orders.ts', 'src/model/order.ts'] };
  const r = checkLayers(g, { layers: layers() });
  eq(pairs(r), ['skip:src/api/orders.ts>src/model/order.ts', 'skip:src/api/orders.ts>src/repository/orders.ts'], 'violations');
  const msg = r.violations[1]!.message;
  check(msg.includes('service'), `le message doit nommer la couche fermée sautée, obtenu « ${msg} »`);
});

test('M2 une couche ouverte peut être sautée', () => {
  const ls = layers();
  ls[1]!.open = true; // service ouverte
  const g: Graph = {
    'src/api/orders.ts': ['src/repository/orders.ts', 'src/model/order.ts'],
  };
  const r = checkLayers(g, { layers: ls });
  eq(pairs(r), ['skip:src/api/orders.ts>src/model/order.ts'],
    "api → repository traverse seulement service (ouverte) ; api → model traverse aussi repository (fermée)");
  ls[2]!.open = true;
  eq(pairs(checkLayers(g, { layers: ls })), [], 'avec service et repository ouvertes');
});

test('M2 une couche ouverte ne permet pas de remonter', () => {
  const ls = layers();
  ls[0]!.open = true;
  const g: Graph = { 'src/service/x.ts': ['src/api/y.ts'] };
  eq(pairs(checkLayers(g, { layers: ls })), ['upward:src/service/x.ts>src/api/y.ts'], 'violations');
});

// ---------- Jalon 3 ----------

const legacy: Graph = {
  'src/api/report.ts': ['src/repository/stats.ts'],
  'src/api/orders.ts': ['src/service/orders.ts'],
  'src/model/a.ts': ['src/api/b.ts'],
};

test('M3 une variance couvre exactement un import', () => {
  const rules: Rules = {
    layers: layers(),
    variances: [{ from: 'src/api/report.ts', to: 'src/repository/stats.ts', reason: 'Rapport en lecture seule, 40 ms gagnées', approvedBy: 'ARB 2026-03' }],
  };
  const r = checkLayers(legacy, rules);
  eq(pairs(r), ['upward:src/model/a.ts>src/api/b.ts'], 'violations restantes');
  eq(r.waived.map((w) => `${w.violation.kind}:${w.variance.approvedBy}`), ['skip:ARB 2026-03'], 'violations couvertes');
  eq(r.unusedVariances, [], 'unusedVariances');
});

test('M3 une variance périmée est signalée', () => {
  const stale = { from: 'src/api/old.ts', to: 'src/model/x.ts', reason: 'Migration 2024', approvedBy: 'ARB' };
  const ok = { from: 'src/model/a.ts', to: 'src/api/b.ts', reason: 'Temporaire', approvedBy: 'Léa' };
  const r = checkLayers(legacy, { layers: layers(), variances: [stale, ok] });
  eq(r.unusedVariances, [stale], 'unusedVariances (une exception qui ne couvre plus rien doit être retirée)');
  eq(pairs(r), ['skip:src/api/report.ts>src/repository/stats.ts'], 'violations');
});

test('M3 une variance sans raison ou sans approbateur est refusée', async () => {
  await raises(() => checkLayers(legacy, {
    layers: layers(), variances: [{ from: 'src/model/a.ts', to: 'src/api/b.ts', reason: '  ', approvedBy: 'Léa' }],
  }), 'variance sans raison', InvalidVarianceError);
  await raises(() => checkLayers(legacy, {
    layers: layers(), variances: [{ from: 'src/model/a.ts', to: 'src/api/b.ts', reason: 'Urgent', approvedBy: '' }],
  }), 'variance sans approbateur', InvalidVarianceError);
});

await run();
