import type { Equals, Expect } from './expect.ts';
import { matchRoute, objectToCamel, toCamel } from './strings.ts';
import type { Attributes, ObjectToCamel, RouteParams, ToCamel } from './strings.ts';

const c = toCamel('user_id');
const o = objectToCamel({ first_name: 'Ada', age: 36 });
const m = matchRoute('/users/:id', '/users/1');

export type Checks = [
  Expect<Equals<ToCamel<'foo_bar_baz'>, 'fooBarBaz'>>,
  Expect<Equals<typeof c, 'userId'>>,
  Expect<Equals<ObjectToCamel<{ first_name: string; last_name: string }>, { firstName: string; lastName: string }>>,
  Expect<Equals<typeof o, { firstName: string; age: number }>>,
  Expect<Equals<RouteParams<'/users/:id/posts/:postId'>, { id: string; postId: string }>>,
  Expect<Equals<RouteParams<'/about'>, {}>>,
  Expect<Equals<typeof m, { id: string } | null>>,
];

export const attrs: Attributes = { id: 'x', 'data-count': 3, 'data-label': 'ok' };
// @ts-expect-error aria-label n'est pas un attribut data-*
export const bad: Attributes = { 'aria-label': 'x' };
