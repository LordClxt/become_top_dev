import { eq, raises, run, test } from './spec.ts';
import { ApiFetcher, fetchAPI, fetchMany } from './api.ts';
import type { SeedAPI } from './api.ts';

test('ApiFetcher.fetch et history', async () => {
  const fetcher = new ApiFetcher<SeedAPI>('https://seeds.example');
  const berry = await fetcher.fetch('/seed/strawberry');
  eq(berry, { name: 'strawberry', daysToHarvest: 60 }, 'strawberry');
  eq(await fetcher.fetch('/count'), 2, '/count');
  eq(fetcher.history(), ['https://seeds.example/seed/strawberry', 'https://seeds.example/count'], 'history');
  fetcher.history().push('x');
  eq(fetcher.history().length, 2, 'history renvoie une copie');
});

test('fetchAPI curryfié', async () => {
  const fetchSeed = fetchAPI<SeedAPI>();
  const seeds = await fetchSeed('/seeds');
  eq(seeds.map((s) => s.name), ['apple', 'strawberry'], '/seeds');
  await raises(() => fetchAPI<Record<string, unknown>>()('/nope'), 'route inconnue');
});

test('fetchMany', async () => {
  const fetcher = new ApiFetcher<SeedAPI>('https://seeds.example');
  const out = await fetchMany(fetcher, ['/seed/apple', '/seed/strawberry']);
  eq(out.map((s) => s.daysToHarvest), [120, 60], 'fetchMany');
  eq(fetcher.history().length, 2, 'deux appels');
});

await run();
