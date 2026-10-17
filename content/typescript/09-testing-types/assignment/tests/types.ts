import type { Equals, Expect } from './expect.ts';
import { fromPairs, head, invert, reverse, zip } from './tuples.ts';
import type { Reverse } from './tuples.ts';

const z = zip([1, 2], ['a', 'b']);
const p = fromPairs([['a', 1], ['b', true]]);
const inv = invert({ a: 'x', b: 'y' });
const r = reverse([1, 'a', true]);
const h = head(['first', 2]);

type Range80 = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
];

export type Checks = [
  Expect<Equals<typeof z, [[1, 'a'], [2, 'b']]>>,
  Expect<Equals<typeof p, { a: 1; b: true }>>,
  Expect<Equals<typeof inv, { x: 'a'; y: 'b' }>>,
  Expect<Equals<typeof r, [true, 'a', 1]>>,
  Expect<Equals<typeof h, 'first'>>,
  Expect<Equals<Reverse<[1, 2, 3]>, [3, 2, 1]>>,
  Expect<Equals<Reverse<Range80>['length'], 80>>,
  Expect<Equals<Reverse<Range80>[0], 9>>,
];

// @ts-expect-error longueurs différentes
zip([1, 2], ['a']);
// @ts-expect-error un tuple vide n'a pas de premier élément
head([]);
// @ts-expect-error invert attend des valeurs chaînes
invert({ a: 1 });
