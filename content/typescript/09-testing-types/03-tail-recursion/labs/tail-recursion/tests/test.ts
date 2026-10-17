import { eq, run, test } from './spec.ts';
import { sum, toSnake } from './recursion.ts';

test('toSnake', () => {
  eq(toSnake('lastLoginAt'), 'last_login_at', 'toSnake');
  eq(toSnake('id'), 'id', 'sans majuscule');
});

test('sum sans dépassement de pile', () => {
  eq(sum([1, 2, 3]), 6, 'petit tableau');
  eq(sum(Array(200_000).fill(1)), 200_000, '200 000 éléments');
});

await run();
