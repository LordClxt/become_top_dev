import { eq, run, test } from './spec.ts';
import { percentile, simulate, type SimConfig } from './loadsim.ts';

const lunch = () => [...Array(50).fill(300), ...Array(10).fill(1500)];
const steady = () => Array(60).fill(500);
const base = { capacityPerInstance: 100, maxQueue: 200, costPerInstanceTick: 1 };
const fixed = (instances: number): SimConfig => ({ ...base, instances });

// ---------- Jalon 1 ----------

test('M1 tick par tick', () => {
  const r = simulate([700, 700, 0], { capacityPerInstance: 100, maxQueue: 50, instances: 6, costPerInstanceTick: 2 });
  eq(r.ticks.map((t) => [t.tick, t.arrivals, t.served, t.queued, t.rejected, t.instances]), [
    [0, 700, 600, 50, 50, 6],
    [1, 700, 600, 50, 100, 6],
    [2, 0, 50, 0, 0, 6],
  ], 'ticks : [tick, arrivées, servies, en file, rejetées, instances]');
  eq([r.served, r.rejected], [1250, 150], '[servies, rejetées] au total');
});

test('M1 même volume, même capacité, deux formes de charge', () => {
  eq(simulate(steady(), fixed(6)).rejected, 0, 'charge régulière (500/tick) avec 600 de capacité');
  eq(simulate(lunch(), fixed(6)).rejected, 8800, 'charge du midi (pic à 1 500/tick) avec 600 de capacité');
  eq(simulate(lunch(), fixed(15)).rejected, 0, 'avec 15 instances fixes');
});

test('M1 la file sert les plus anciennes d’abord et rejette les plus récentes', () => {
  // 1 instance, file de 100. Tick 0 : 250 arrivent, 100 servies, 150 en file → 50 rejetées (de ce tick).
  // Tick 1 : 0 arrivée ; les 100 restantes (arrivées au tick 0) sont servies.
  const r = simulate([250, 0], { capacityPerInstance: 100, maxQueue: 100, instances: 1, costPerInstanceTick: 1 });
  eq(r.ticks.map((t) => [t.served, t.queued, t.rejected]), [[100, 100, 50], [100, 0, 0]], '[servies, en file, rejetées] par tick');
});

// ---------- Jalon 2 ----------

test('M2 percentile au rang le plus proche', () => {
  const h = new Map([[0, 90], [3, 9], [10, 1]]);
  eq([percentile(h, 0.5), percentile(h, 0.9), percentile(h, 0.95), percentile(h, 0.99), percentile(h, 1)], [0, 0, 3, 3, 10],
    'p50, p90, p95, p99, p100 de 90 requêtes à 0, 9 à 3, 1 à 10');
  eq(percentile(new Map(), 0.99), 0, 'histogramme vide');
  eq(percentile(new Map([[5, 0], [2, 4]]), 0.5), 2, 'les clés ne sont pas forcément triées');
});

test('M2 attentes et coût', () => {
  const r = simulate([700, 700, 0], { capacityPerInstance: 100, maxQueue: 50, instances: 6, costPerInstanceTick: 2 });
  eq([r.p50Wait, r.p99Wait], [0, 1], '[p50, p99] : 1 150 requêtes servies sans attendre, 100 après 1 tick');
  eq(r.cost, 36, 'coût : 6 instances × 3 ticks × 2');
  const deep = simulate([500, 0, 0, 0, 0], { capacityPerInstance: 100, maxQueue: 1000, instances: 1, costPerInstanceTick: 1 });
  eq([deep.p50Wait, deep.p99Wait], [2, 4], '[p50, p99] quand 500 requêtes s’écoulent à 100 par tick');
});

test('M2 le prix de la capacité fixe', () => {
  const six = simulate(lunch(), fixed(6));
  const fifteen = simulate(lunch(), fixed(15));
  eq([six.cost, fifteen.cost], [360, 900], 'coût de 6 et de 15 instances fixes sur 60 ticks');
  eq([fifteen.p50Wait, fifteen.p99Wait], [0, 0], '15 instances : personne n’attend');
});

// ---------- Jalon 3 ----------

const auto = (delayTicks: number): SimConfig =>
  ({ ...base, instances: 4, autoscale: { min: 4, max: 20, targetUtilization: 0.8, delayTicks } });

test('M3 l’autoscaler suit le pic avec un délai', () => {
  const r = simulate(lunch(), auto(2));
  eq(r.ticks.slice(48, 56).map((t) => t.instances), [4, 4, 4, 4, 20, 20, 19, 19],
    'instances des ticks 48 à 55 : la décision du tick 50 (plafonnée à 20) s’applique au tick 52');
  eq([r.rejected, r.cost], [2000, 362], '[rejetées, coût] : beaucoup moins cher que 15 instances fixes, mais des pertes pendant le démarrage');
});

test('M3 un démarrage plus rapide perd moins', () => {
  const r = simulate(lunch(), auto(1));
  eq([r.rejected, r.cost], [900, 376], '[rejetées, coût] avec un délai de 1 tick');
});

test('M3 l’autoscaler redescend', () => {
  const r = simulate([1000, 100, 100, 100, 100],
    { ...base, instances: 2, autoscale: { min: 2, max: 10, targetUtilization: 0.5, delayTicks: 1 } });
  eq(r.ticks.map((t) => t.instances), [2, 10, 2, 2, 2], 'instances par tick');
  eq(r.cost, 18, 'coût');
});

test('M3 sans autoscaler, le nombre d’instances ne bouge pas', () => {
  eq(new Set(simulate(lunch(), fixed(6)).ticks.map((t) => t.instances)).size, 1, 'valeurs distinctes d’instances');
});

await run();
