import { eq, run, test } from './spec.ts';
import { matchRoute, objectToCamel, toCamel } from './strings.ts';

test('toCamel et objectToCamel', () => {
  eq(toCamel('foo_bar_baz'), 'fooBarBaz', 'toCamel');
  eq(toCamel('id'), 'id', 'sans _');
  eq(objectToCamel({ first_name: 'Ada', last_name: 'Lovelace', id: 1 }), { firstName: 'Ada', lastName: 'Lovelace', id: 1 }, 'objectToCamel');
});

test('matchRoute', () => {
  eq(matchRoute('/users/:id/posts/:postId', '/users/7/posts/42'), { id: '7', postId: '42' }, 'deux paramètres');
  eq(matchRoute('/users/:id', '/users/7/posts'), null, 'longueur différente');
  eq(matchRoute('/users/:id', '/teams/7'), null, 'segment fixe différent');
  eq(matchRoute('/about', '/about'), {}, 'sans paramètre');
});

await run();
