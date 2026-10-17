import { check, eq, run, test } from './spec.ts';
import { extent, Profile, range } from './stats.ts';
import type { Api } from './stats.ts';

test('extent', () => {
  eq(extent([0, 1, 2]), [0, 2], 'extent([0, 1, 2])');
  eq(extent([3, -1, 0]), [-1, 3], 'extent([3, -1, 0])');
  eq(extent(new Set([5])), [5, 5], 'un seul élément');
  eq(extent([]), null, 'vide');
});

test('range', () => {
  eq(range([0, 10, 4]), 10, 'range');
  eq(range([7]), 0, 'un seul élément');
  eq(range([]), null, 'vide');
});

function fakeApi(delayMs: number): Api {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  return {
    async fetchUser(id) { await wait(); return { id, name: 'Ada' }; },
    async fetchPosts() { await wait(); return [{ title: 'Ancien', publishedAt: 1 }, { title: 'Récent', publishedAt: 9 }, { title: 'Moyen', publishedAt: 5 }]; },
  };
}

test('Profile.load en parallèle', async () => {
  const start = Date.now();
  const p = await Profile.load('u1', fakeApi(60));
  check(Date.now() - start < 110, 'les deux requêtes partent en même temps');
  check(p instanceof Profile, 'un Profile');
  eq(p.user, { id: 'u1', name: 'Ada' }, 'user');
  eq(p.summary(), 'Ada (3 billets)', 'summary');
  eq(p.latestTitle(), 'Récent', 'latestTitle');
});

test('Profile sans billet', () => {
  const p = new Profile({ id: 'u2', name: 'Bob' }, []);
  eq(p.summary(), 'Bob (0 billets)', 'summary');
  eq(p.latestTitle(), null, 'latestTitle');
});

await run();
