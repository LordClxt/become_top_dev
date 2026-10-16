import { check, eq, run, test } from './spec.ts';
import { arraySum, lastTwo, rename, sortedCopy, triangles } from './pure.ts';

test('arraySum ne modifie pas son argument', () => {
  const frozen = Object.freeze([1, 2, 3]);
  eq(arraySum(frozen), 6, 'arraySum([1, 2, 3])');
  eq([...frozen], [1, 2, 3], 'le tableau d’origine doit rester intact');
  eq(arraySum([]), 0, 'arraySum([])');
});

test('triangles : 0 1 3 6 10', () => {
  eq(triangles(5), [0, 1, 3, 6, 10], 'triangles(5)');
  eq(triangles(0), [], 'triangles(0)');
});

test('sortedCopy : trie une copie', () => {
  const frozen = Object.freeze([3, 1, 2]);
  eq(sortedCopy(frozen), [1, 2, 3], 'sortedCopy([3, 1, 2])');
  eq([...frozen], [3, 1, 2], 'l’original ne change pas');
});

test('rename renvoie un nouvel utilisateur', () => {
  const user = Object.freeze({ id: 'u1', name: 'Ada', tags: ['a'] });
  const renamed = rename(user, 'Grace');
  eq(renamed, { id: 'u1', name: 'Grace', tags: ['a'] }, 'rename(user, "Grace")');
  eq(user.name, 'Ada', 'l’utilisateur d’origine ne change pas');
  check(renamed.tags !== user.tags, 'les tags ne doivent pas être partagés entre les deux utilisateurs');
});

test('lastTwo', () => {
  eq(lastTwo(['a', 'b', 'c']), ['b', 'c'], "lastTwo(['a','b','c'])");
  eq(lastTwo(['a']), undefined, "lastTwo(['a'])");
  eq(lastTwo([]), undefined, 'lastTwo([])');
});

await run();
