import type { StyleExpression } from './style.ts';

export const ok: StyleExpression[] = [
  1, 'red', true,
  ['get', 'name'],
  ['-', 3], ['-', 3, 1], ['+', 1, ['get', 'x']],
  ['>=', ['get', 'population'], 1000],
  ['case', ['get', 'capital'], 'red', 'blue'],
  ['match', ['get', 'kind'], 'city', 8, 'town', 4, 2],
  ['coalesce', ['get', 'a']],
  ['coalesce', ['get', 'a'], ['get', 'b'], 0],
];

// @ts-expect-error get prend un nom de propriété
export const i1: StyleExpression = ['get', 1];
// @ts-expect-error opérateur inconnu
export const i2: StyleExpression = ['**', 2, 3];
// @ts-expect-error case a une longueur paire
export const i3: StyleExpression = ['case', true, 'a', 'b', 'c'];
// @ts-expect-error match a une longueur impaire
export const i4: StyleExpression = ['match', 'x', 'a', 1];
// @ts-expect-error coalesce prend au moins une expression
export const i5: StyleExpression = ['coalesce'];
// @ts-expect-error null n'est pas une expression
export const i6: StyleExpression = null;
