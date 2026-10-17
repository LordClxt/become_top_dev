import { check, eq, raises, run, test } from './spec.ts';
import { averageByCountry, hottest, loadAll, retry, weatherService } from './weather.ts';

test('retry', async () => {
  let n = 0;
  eq(await retry(async () => { n++; if (n < 3) throw new Error(`échec ${n}`); return 'ok'; }, 3), 'ok', 'succès au 3e essai');
  let m = 0;
  const e = await raises(() => retry(async () => { m++; throw new Error(`échec ${m}`); }, 2), 'toujours en échec');
  eq(e.message, 'échec 2', 'dernière erreur');
  eq(m, 2, 'deux essais');
});

test('loadAll : parallèle, tentatives et délai', async () => {
  const start = Date.now();
  const { readings, failed } = await loadAll(['Paris', 'Lyon', 'Berlin', 'Munich', 'Oslo', 'Rome'], 150);
  eq(readings.map((r) => r.city), ['Paris', 'Lyon', 'Berlin'], 'villes chargées (Lyon au 2e essai)');
  eq(failed, ['Munich', 'Oslo', 'Rome'], 'villes en échec (lente, en panne, inconnue)');
  check(Date.now() - start < 260, 'les villes sont chargées en parallèle et le délai coupe Munich');
  eq(readings[0], { city: 'Paris', country: 'FR', tempC: 18.4 }, 'relevé de Paris');
  check(weatherService.calls >= 6, 'le service a bien été appelé');
});

test('averageByCountry', () => {
  eq(averageByCountry([
    { city: 'Paris', country: 'FR', tempC: 18.4 },
    { city: 'Lyon', country: 'FR', tempC: 21.1 },
    { city: 'Berlin', country: 'DE', tempC: 15.2 },
  ]), { FR: 19.8, DE: 15.2 }, 'moyennes');
  eq(averageByCountry([]), {}, 'aucun relevé');
});

test('hottest', () => {
  const rs = [
    { city: 'A', country: 'X', tempC: 10 },
    { city: 'B', country: 'X', tempC: 25 },
    { city: 'C', country: 'Y', tempC: 12 },
  ];
  eq(hottest(rs)?.city, 'B', 'le plus chaud');
  eq(rs.map((r) => r.city), ['A', 'B', 'C'], 'non modifié');
  eq(hottest([]), undefined, 'liste vide');
});

await run();
