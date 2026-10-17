import { eq, run, test } from './spec.ts';
import { parseOrNull, range, squaresOf, tokenize } from './collect.ts';

test('range', () => {
  eq(range(2, 5), [2, 3, 4], 'range(2, 5)');
  eq(range(3, 3), [], 'range(3, 3)');
});

test('tokenize', () => {
  eq(tokenize('a 12 b'), ['a', 12, 'b'], "tokenize('a 12 b')");
  eq(tokenize('x1 007'), ['x1', 7], "tokenize('x1 007')");
  eq(tokenize(''), [], "tokenize('')");
});

test('parseOrNull', () => {
  eq(parseOrNull('42'), 42, "parseOrNull('42')");
  eq(parseOrNull('"42"'), null, 'une chaîne JSON');
  eq(parseOrNull('{'), null, 'JSON invalide');
});

test('squaresOf', () => {
  eq(squaresOf([1, 2, 3]), [1, 4, 9], 'squaresOf([1, 2, 3])');
  eq(squaresOf([]), [], 'squaresOf([])');
});

await run();
