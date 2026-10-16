import { check, eq, raises, run, test } from './spec.ts';
import { BoundsMismatchError, Recorder } from './recorder.ts';

const bounds = [1, 5, 25, 100];

function fill(r: Recorder, op: string, ms: number, n: number) {
  for (let i = 0; i < n; i++) r.record(op, ms);
}

test('M1 enregistrer et lire un percentile', () => {
  const r = new Recorder(bounds);
  fill(r, 'get', 2, 90); // tranche ≤ 5
  fill(r, 'get', 25, 9); // borne incluse : tranche ≤ 25
  fill(r, 'get', 300, 1);
  eq(r.count('get'), 100, "count('get')");
  for (const [p, want] of [[50, 5], [90, 5], [91, 25], [99, 25]] as const) {
    eq(r.quantile('get', p), want, `quantile('get', ${p})`);
  }
  eq(r.quantile('get', 100), Infinity, "quantile('get', 100) (tranche de débordement)");
});

test('M1 les opérations sont indépendantes', () => {
  const r = new Recorder(bounds);
  fill(r, 'get', 1, 3);
  fill(r, 'put', 50, 2);
  eq([r.count('get'), r.count('put'), r.count('scan')], [3, 2, 0], 'comptes get/put/scan');
  eq(r.quantile('put', 50), 100, "quantile('put', 50)");
  eq(r.quantile('scan', 99), 0, 'quantile d’une opération inconnue');
});

test('M1 les bornes sont copiées', () => {
  const b = [1, 5];
  const r = new Recorder(b);
  b[0] = 100;
  r.record('x', 1);
  eq(r.quantile('x', 100), 1, 'quantile après modification du tableau de l’appelant (le Recorder doit avoir sa copie)');
});

test('M1 les durées sous la milliseconde comptent', () => {
  const r = new Recorder(bounds);
  r.record('get', 0.3);
  eq(r.quantile('get', 50), 1, '0,3 ms doit tomber dans la tranche ≤ 1 ms — n’arrondis pas en millisecondes entières');
});

test('M2 ops() triées', () => {
  const r = new Recorder(bounds);
  r.record('put', 1);
  r.record('get', 1);
  r.record('delete', 1);
  eq(r.ops(), ['delete', 'get', 'put'], 'ops()');
  eq(new Recorder(bounds).ops(), [], 'ops() d’un Recorder vide');
});

test('M2 fusionner n’est pas moyenner', () => {
  const a = new Recorder(bounds), b = new Recorder(bounds);
  fill(a, 'get', 1, 1000);
  fill(b, 'get', 100, 10);
  fill(b, 'scan', 25, 4); // opération inconnue de a
  const avg = (a.quantile('get', 95) + b.quantile('get', 95)) / 2;
  a.merge(b);
  eq([a.count('get'), a.count('scan')], [1010, 4], 'comptes après fusion (get, scan)');
  eq(a.quantile('get', 95), 1, `p95 fusionné (la moyenne des p95, ${avg}, est fausse)`);
  eq(b.count('get'), 10, 'merge a modifié other');
});

test('M2 other reste indépendant après la fusion', () => {
  const a = new Recorder(bounds), b = new Recorder(bounds);
  fill(b, 'scan', 1, 2);
  a.merge(b);
  a.record('scan', 1);
  eq(b.count('scan'), 2, 'a et b partagent leurs compteurs après merge — copie les comptes');
});

test('M2 bornes différentes', async () => {
  const a = new Recorder([1, 5]), b = new Recorder([1, 10]);
  b.record('get', 1);
  await raises(() => a.merge(b), 'merge de bornes différentes', BoundsMismatchError);
  eq(a.ops(), [], 'un merge en échec ne doit rien modifier');
});

test('M3 latence respectée ou violée', () => {
  const r = new Recorder(bounds);
  fill(r, 'get', 2, 99);
  fill(r, 'get', 90, 1);
  eq(r.evaluate({ op: 'get', percentile: 99, maxMs: 5, availability: 0.99 }, 0),
    { op: 'get', observedMs: 5, latencyMet: true, budgetRemaining: 1 }, 'p99 = 5 ms ≤ 5 ms');
  const bad = r.evaluate({ op: 'get', percentile: 100, maxMs: 50, availability: 0.99 }, 0);
  check(!bad.latencyMet && bad.observedMs === 100, `p100 = 100 ms > 50 ms doit être violé, obtenu ${JSON.stringify(bad)}`);
});

test('M3 budget d’erreur', () => {
  const r = new Recorder(bounds);
  fill(r, 'put', 1, 1000);
  const slo = { op: 'put', percentile: 99, maxMs: 10, availability: 0.999 };
  for (const [failed, want] of [[0, 1], [1, 0], [3, -2]] as const) {
    eq(r.evaluate(slo, failed).budgetRemaining, want, `${failed} échecs sur 1000 à 99,9 % : budget restant`);
  }
  eq(r.evaluate({ ...slo, availability: 0.99 }, 4).budgetRemaining, 6, 'à 99 % sur 1000 avec 4 échecs (10 tolérés − 4)');
});

test('M3 sans mesure', () => {
  eq(new Recorder(bounds).evaluate({ op: 'get', percentile: 99, maxMs: 5, availability: 0.999 }, 0),
    { op: 'get', observedMs: 0, latencyMet: true, budgetRemaining: 0 }, 'verdict sans mesure');
});

await run();
