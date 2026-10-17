import { eq, raises, run, test } from './spec.ts';
import { convert, double, firstOrSelf } from './conditional.ts';

test('double', () => {
  eq(double(21), 42, 'nombre');
  eq(double('ab'), 'abab', 'chaîne');
  const mixed: (string | number)[] = [1, 'x'];
  eq(mixed.map((v) => double(v)), [2, 'xx'], 'union');
});

test('convert', async () => {
  eq(convert('int', '42'), 42, 'int');
  eq(convert('bool', 'true'), true, 'bool true');
  eq(convert('bool', 'yes'), false, 'bool autre');
  eq(convert('text', 'abc'), 'abc', 'text');
  eq((await raises(() => convert('int', 'abc'), 'NaN')).message, 'entier invalide', 'message');
});

test('firstOrSelf', () => {
  eq(firstOrSelf([3, 4]), 3, 'tableau');
  eq(firstOrSelf([]), undefined, 'tableau vide');
  eq(firstOrSelf('a'), 'a', 'valeur');
});

await run();
