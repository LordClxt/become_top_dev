import { eq, run, test } from './spec.ts';
import * as s from './signatures.ts';

test('comportement inchangé', () => {
  eq(s.third(1, 'a', true), true, 'third');
  eq(s.parseJSON('[1]'), [1], 'parseJSON');
  eq(s.printProperty({ age: 36 }, 'age'), 'age = 36', 'printProperty');
  eq(s.getProperty({ age: 36 }, 'age'), 36, 'getProperty');
  eq(s.getLength('abc'), 3, 'getLength');
  eq('join' in s ? (s as { join: (els: (string | number)[]) => string }).join([1, 'a']) : null, '1,a', 'join');
});

await run();
