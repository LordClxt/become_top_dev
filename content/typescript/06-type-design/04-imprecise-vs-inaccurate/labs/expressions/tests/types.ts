import type { Expression } from './expression.ts';

/** Exemples valides : doivent tous compiler. */
export const okExpressions: Expression[] = [
  10,
  'red',
  ['+', 10, 5],
  ['-', 12],
  ['-', 12, 2],
  ['rgb', 255, 128, 64],
  ['case', ['>', 20, 10], 'red', 'blue'],
  ['case', ['<', 1, 0], 'a', ['>', 2, 1], 'b', 'c'],
];

/** Exemples invalides : chacun doit être refusé. */
// @ts-expect-error un booléen n'est pas une expression
export const i1: Expression = true;
// @ts-expect-error pas de fonction **
export const i2: Expression = ['**', 2, 31];
// @ts-expect-error rgb prend trois valeurs
export const i3: Expression = ['rgb', 255, 0, 127, 0];
// @ts-expect-error case a une longueur paire
export const i4: Expression = ['case', ['>', 20, 10], 'red', 'blue', 'green'];
// @ts-expect-error l'addition prend deux opérandes
export const i5: Expression = ['+', 1];
