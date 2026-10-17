import { check, eq, raises, run, test } from './spec.ts';
import { fetchBoth, fetchWithCache, server, timeout, withTimeout } from './fetching.ts';

test('fetchBoth en parallèle', async () => {
  const start = Date.now();
  eq(await fetchBoth('/users', '/posts'), [{ url: '/users' }, { url: '/posts' }], 'fetchBoth');
  check(Date.now() - start < 110, 'les deux requêtes (60 ms chacune) doivent partir en même temps');
});

test('timeout', async () => {
  const e = await raises(() => timeout(5), 'timeout(5)');
  eq(e.message, 'délai dépassé', 'message');
});

test('withTimeout', async () => {
  eq(await withTimeout(server.fetchJSON('/fast'), 100), { url: '/fast' }, 'à temps');
  const e = await raises(() => withTimeout(server.fetchJSON('/slow'), 20), 'trop lent');
  eq(e.message, 'délai dépassé', 'message');
});

test('fetchWithCache dédoublonne', async () => {
  const before = server.calls;
  const p1 = fetchWithCache('/users');
  const p2 = fetchWithCache('/users');
  check(p1 instanceof Promise, 'renvoie une promesse');
  eq(await Promise.all([p1, p2]), [{ url: '/users' }, { url: '/users' }], 'résultats');
  await fetchWithCache('/users');
  eq(server.calls - before, 1, 'une seule requête pour /users');
});

test('fetchWithCache réessaie après un échec', async () => {
  const before = server.calls;
  await raises(() => fetchWithCache('/broken'), 'premier échec');
  await raises(() => fetchWithCache('/broken'), 'second échec');
  eq(server.calls - before, 2, 'un échec est retiré du cache');
});

await run();
