import { eq, run, test } from './spec.ts';
import { withDefaults } from './display.ts';

test('withDefaults', () => {
  eq(withDefaults({ theme: 'dark', size: 14 }, { size: 16, compact: true }), { theme: 'dark', size: 16, compact: true }, 'fusion');
});

await run();
