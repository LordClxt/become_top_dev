import { eq, run, test } from './spec.ts';
import { assertType } from './kit.ts';

test('assertType ne fait rien à l’exécution', () => {
  const xs = [1, 2];
  eq(assertType<number[]>()(xs), xs, 'renvoie la valeur');
});

await run();
