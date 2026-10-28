import { check, eq, raises, run, test } from './spec.ts';
import { backoffDelays, chain, CircuitBreaker, CircuitOpenError, percentileOf, retry, type Clock } from './resilience.ts';

/** Horloge simulée : sleep avance le temps instantanément et garde la trace des attentes. */
class FakeClock implements Clock {
  t = 0;
  slept: number[] = [];
  now() { return this.t; }
  async sleep(ms: number) { this.slept.push(ms); this.t += ms; }
}
/** Suite de tirages prévisibles. */
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]!; };
class Transient extends Error {}
class Fatal extends Error {}

// ---------- Jalon 1 ----------

test('M1 backoff exponentiel plafonné, avec full jitter', () => {
  eq(backoffDelays({ tries: 5, baseMs: 100, maxMs: 1000, random: () => 0.999999 }), [99, 199, 399, 799], 'tirage proche de 1 : les plafonds 100, 200, 400, 800 (moins un)');
  eq(backoffDelays({ tries: 6, baseMs: 100, maxMs: 500, random: () => 0.5 }), [50, 100, 200, 250, 250], 'tirage 0,5 avec un plafond absolu de 500');
  eq(backoffDelays({ tries: 1, baseMs: 100, maxMs: 500, random: () => 0.5 }), [], 'une seule tentative : aucun délai');
});

test('M1 retry réussit après des échecs transitoires', async () => {
  const clock = new FakeClock();
  const seen: number[] = [];
  const r = await retry(async (attempt) => {
    seen.push(attempt);
    if (attempt < 3) throw new Transient('réseau');
    return 'ok';
  }, { tries: 4, baseMs: 100, maxMs: 1000, random: seq(0.5, 0.25, 0.9), clock });
  eq([r, seen], ['ok', [1, 2, 3]], '[résultat, tentatives]');
  eq(clock.slept, [50, 50], 'attentes avant les tentatives 2 et 3');
});

test('M1 retry abandonne après la dernière tentative', async () => {
  const clock = new FakeClock();
  let calls = 0;
  const e = await raises(() => retry(async () => { calls++; throw new Transient(`essai ${calls}`); },
    { tries: 3, baseMs: 10, maxMs: 100, random: () => 0, clock }), 'toutes les tentatives échouent', Transient);
  eq([calls, e.message, clock.slept.length], [3, 'essai 3', 2], '[appels, dernière erreur levée, attentes]');
});

test('M1 une erreur non retentable est levée tout de suite', async () => {
  const clock = new FakeClock();
  let calls = 0;
  await raises(() => retry(async () => { calls++; throw new Fatal('carte refusée'); },
    { tries: 5, baseMs: 10, maxMs: 100, random: () => 0.5, clock, retryable: (err) => err instanceof Transient }), 'erreur métier', Fatal);
  eq([calls, clock.slept], [1, []], '[appels, attentes]');
});

// ---------- Jalon 2 ----------

const ok = async () => 'ok';
const ko = async (): Promise<string> => { throw new Transient('ko'); };

test('M2 le disjoncteur s’ouvre après le seuil d’échecs consécutifs', async () => {
  const clock = new FakeClock();
  const b = new CircuitBreaker({ failureThreshold: 3, openMs: 1000, clock });
  eq(b.state(), 'closed', 'état initial');
  await raises(() => b.call(ko), 'échec 1', Transient);
  await raises(() => b.call(ko), 'échec 2', Transient);
  eq(await b.call(ok), 'ok', 'un succès remet le compteur à zéro');
  for (let i = 0; i < 2; i++) await raises(() => b.call(ko), `échec ${i + 1} après le succès`, Transient);
  eq(b.state(), 'closed', 'deux échecs consécutifs : encore fermé');
  await raises(() => b.call(ko), 'troisième échec consécutif', Transient);
  eq(b.state(), 'open', 'état après 3 échecs consécutifs');
});

test('M2 ouvert : refus immédiat sans appeler le service', async () => {
  const clock = new FakeClock();
  const b = new CircuitBreaker({ failureThreshold: 1, openMs: 1000, clock });
  await raises(() => b.call(ko), 'échec', Transient);
  let called = false;
  await raises(() => b.call(async () => { called = true; return 'x'; }), 'appel pendant l’ouverture', CircuitOpenError);
  eq(called, false, 'le service ne doit pas être appelé quand le circuit est ouvert');
  clock.t = 999;
  eq(b.state(), 'open', 'à 999 ms');
  clock.t = 1000;
  eq(b.state(), 'half-open', 'à 1 000 ms');
});

test('M2 demi-ouvert : un essai réussi referme, un essai raté rouvre', async () => {
  const clock = new FakeClock();
  const b = new CircuitBreaker({ failureThreshold: 2, openMs: 500, clock });
  await raises(() => b.call(ko), 'échec 1', Transient);
  await raises(() => b.call(ko), 'échec 2', Transient);
  clock.t += 500;
  await raises(() => b.call(ko), 'essai demi-ouvert raté', Transient);
  eq(b.state(), 'open', 'un essai raté rouvre aussitôt (même sous le seuil)');
  clock.t += 499;
  eq(b.state(), 'open', 'la nouvelle ouverture repart de l’essai raté');
  clock.t += 1;
  eq(await b.call(ok), 'ok', 'essai réussi');
  eq(b.state(), 'closed', 'refermé');
});

test('M2 un seul essai à la fois en demi-ouvert', async () => {
  const clock = new FakeClock();
  const b = new CircuitBreaker({ failureThreshold: 1, openMs: 100, clock });
  await raises(() => b.call(ko), 'échec', Transient);
  clock.t = 100;
  let release!: () => void;
  const slow = b.call(() => new Promise<string>((res) => { release = () => res('lent'); }));
  await raises(() => b.call(ok), 'second appel pendant l’essai', CircuitOpenError);
  release();
  eq(await slow, 'lent', 'résultat de l’essai');
  eq(b.state(), 'closed', 'refermé après l’essai');
});

// ---------- Jalon 3 ----------

const d = (entries: [number, number][]) => new Map(entries);

test('M3 la somme de deux latences', () => {
  const r = chain([d([[10, 1], [20, 1]]), d([[100, 3], [200, 1]])]);
  eq([...r.entries()].sort((a, b) => a[0] - b[0]), [[110, 0.375], [120, 0.375], [210, 0.125], [220, 0.125]], 'distribution de la somme (poids normalisés)');
  eq(chain([]), new Map([[0, 1]]), 'chaîne vide : latence nulle');
});

test('M3 la queue s’amplifie le long de la chaîne', () => {
  const service = d([[60, 99], [400, 1]]);
  eq(percentileOf(service, 0.99), 60, 'p99 d’un service');
  const ten = chain(Array(10).fill(service));
  eq(percentileOf(ten, 0.5), 600, 'p50 de 10 services');
  eq(percentileOf(ten, 0.95), 940, 'p95 de 10 services : un appel lent suffit (9 × 60 + 400)');
  const p = [...ten.entries()].filter(([k]) => k > 600).reduce((a, [, v]) => a + v, 0);
  check(Math.abs(p - (1 - 0.99 ** 10)) < 1e-9, `P(au moins un appel lent) doit valoir 1 − 0,99¹⁰, obtenu ${p}`);
});

test('M3 percentile sur des poids bruts', () => {
  eq(percentileOf(d([[5, 2], [1, 2], [9, 1]]), 0.8), 5, 'p80 de {1, 1, 5, 5, 9}');
  eq(percentileOf(d([[5, 2], [1, 2], [9, 1]]), 1), 9, 'p100');
});

await run();
