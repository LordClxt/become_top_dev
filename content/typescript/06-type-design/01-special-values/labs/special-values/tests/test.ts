import { eq, run, test } from './spec.ts';
import { fromLegacy, lookup, safeIndexOf, splitAround, totals } from './special.ts';

test('safeIndexOf', () => {
  eq(safeIndexOf(['a', 'b'], 'b'), 1, 'trouvé');
  eq(safeIndexOf(['a', 'b'], 'a'), 0, 'trouvé en 0');
  eq(safeIndexOf(['a', 'b'], 'z'), null, 'absent');
});

test('splitAround', () => {
  eq(splitAround([1, 2, 3, 4, 5], 3), [[1, 2], [4, 5]], 'présent');
  eq(splitAround([1, 2, 3, 4, 5], 6), [[1, 2, 3, 4, 5], []], 'absent');
  eq(splitAround([1, 2], 1), [[], [2]], 'au début');
});

test('Price', () => {
  eq(fromLegacy(10, 0), { kind: 'dollars', amount: 10 }, 'dollars');
  eq(fromLegacy(-1, 3), { kind: 'credits', count: 3 }, 'crédits');
  eq(totals([fromLegacy(10.1, 0), fromLegacy(-1, 3), fromLegacy(5.2, 0), fromLegacy(-1, 2)]), { dollars: 15.3, credits: 5 }, 'totaux');
  eq(totals([]), { dollars: 0, credits: 0 }, 'aucun prix');
});

test('lookup', () => {
  const m = new Map([['a', 1], ['_secret', 2], ['zero', 0]]);
  eq(lookup(m, 'a'), { status: 'found', value: 1 }, 'trouvé');
  eq(lookup(m, 'zero'), { status: 'found', value: 0 }, '0 est une valeur');
  eq(lookup(m, 'b'), { status: 'missing' }, 'absent');
  eq(lookup(m, '_secret'), { status: 'forbidden' }, 'interdit');
});

await run();
