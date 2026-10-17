import { eq, run, test } from './spec.ts';
import { callTwice, countItems, loadUser, pickKeys, userLabel } from './legacy.ts';

test('comportement inchangé', () => {
  eq(countItems([1, 'a', null]), 3, 'countItems');
  eq(pickKeys({ a: 1, b: 2, c: 3 }, ['a', 'c', 'z']), { a: 1, c: 3 }, 'pickKeys');
  let n = 0;
  eq(callTwice(() => ++n), [1, 2], 'callTwice');
  eq(loadUser('u1'), { id: 'u1', name: 'Ada', age: 36 }, 'loadUser');
  eq(userLabel('u1'), 'Ada (36 ans)', 'userLabel');
});

await run();
