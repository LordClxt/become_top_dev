import { eq, run, test } from './spec.ts';
import { isLessThan, repeat } from './distribution.ts';

test('isLessThan', () => {
  eq(isLessThan(new Date(1000), new Date(2000)), true, 'dates');
  eq(isLessThan(new Date(3000), 2000), false, 'date et millisecondes');
  eq(isLessThan(2, 10), true, 'nombres');
  eq(isLessThan('b', 'a'), false, 'chaînes');
});

test('repeat', () => {
  eq(repeat('x', 3), ['x', 'x', 'x'], 'repeat');
  eq(repeat(0, 0), [], 'zéro');
});

await run();
