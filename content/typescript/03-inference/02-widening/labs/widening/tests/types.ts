import type { Equals, Expect } from './expect.ts';
import { routes, tuple } from './routes.ts';
import type { HttpMethod, RouteName } from './routes.ts';

const pair = tuple(1, 'a');
const triple = tuple(true, 2, [3]);

export type Checks = [
  Expect<Equals<HttpMethod, 'GET' | 'POST' | 'PUT' | 'DELETE'>>,
  Expect<Equals<RouteName, 'home' | 'createUser' | 'deleteUser'>>,
  Expect<Equals<typeof pair, [number, string]>>,
  Expect<Equals<typeof triple, [boolean, number, number[]]>>,
];

export const p: string = routes.home.path;
// @ts-expect-error la route hmoe n'existe pas
export const typo = routes.hmoe;
