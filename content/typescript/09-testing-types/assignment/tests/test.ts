import { eq, run, test } from './spec.ts';
import { fromPairs, head, invert, reverse, zip } from './tuples.ts';

test('comportement inchangé', () => {
  eq(zip([1, 2], ['a', 'b']), [[1, 'a'], [2, 'b']], 'zip');
  eq(fromPairs([['a', 1], ['b', true]]), { a: 1, b: true }, 'fromPairs');
  eq(invert({ a: 'x', b: 'y' }), { x: 'a', y: 'b' }, 'invert');
  eq(reverse([1, 'a', true]), [true, 'a', 1], 'reverse');
  eq(head([3, 4]), 3, 'head');
});

await run();
