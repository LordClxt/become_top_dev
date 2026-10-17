import { eq, run, test } from './spec.ts';
import { buildQuery, contactCard, withId } from './build.ts';

test('withId', () => {
  const user = { name: 'Ada' };
  eq(withId(user, 'u1'), { name: 'Ada', id: 'u1' }, "withId({ name: 'Ada' }, 'u1')");
  eq(user, { name: 'Ada' }, "l'original ne change pas");
});

test('buildQuery sans options', () => {
  eq(buildQuery('ts'), { text: 'ts', page: 1 }, "buildQuery('ts')");
  eq(Object.keys(buildQuery('ts', { sort: undefined, tags: [] })), ['text', 'page'], 'aucune clé vide ou undefined');
});

test('buildQuery avec options', () => {
  eq(buildQuery('ts', { page: 3, sort: 'date' }), { text: 'ts', page: 3, sort: 'date' }, 'page et sort');
  eq(buildQuery('ts', { tags: ['go', 'ts'] }), { text: 'ts', page: 1, tags: ['go', 'ts'] }, 'tags');
});

test('contactCard', () => {
  eq(contactCard('Harry', 'Truman', 'S'), { first: 'Harry', last: 'Truman', middle: 'S', fullName: 'Harry S Truman' }, 'avec middle');
  eq(contactCard('Ada', 'Lovelace'), { first: 'Ada', last: 'Lovelace', fullName: 'Ada Lovelace' }, 'sans middle');
  eq(Object.keys(contactCard('Ada', 'Lovelace', '')).includes('middle'), false, "middle vide : pas de clé");
});

await run();
