import { eq, raises, run, test } from './spec.ts';
import { evaluate } from './expression.ts';

test('valeurs et mathématiques', () => {
  eq(evaluate(10), 10, '10');
  eq(evaluate('red'), 'red', "'red'");
  eq(evaluate(['+', 10, 5]), 15, '+');
  eq(evaluate(['*', ['+', 1, 2], 4]), 12, 'imbriqué');
  eq(evaluate(['/', 9, 3]), 3, '/');
  eq(evaluate(['-', 12]), -12, 'moins unaire');
  eq(evaluate(['-', 12, 2]), 10, 'moins binaire');
  eq(evaluate(['>', 20, 10]), true, '>');
  eq(evaluate(['<', 20, 10]), false, '<');
});

test('case', () => {
  eq(evaluate(['case', ['>', 20, 10], 'red', 'blue']), 'red', 'première condition vraie');
  eq(evaluate(['case', ['<', 20, 10], 'red', 'blue']), 'blue', 'défaut');
  eq(evaluate(['case', ['<', 1, 0], 'a', ['>', 2, 1], 'b', 'c']), 'b', 'deuxième paire');
});

test('rgb', () => {
  eq(evaluate(['rgb', 255, 128, ['+', 60, 4]]), 'rgb(255, 128, 64)', 'rgb');
});

test('erreurs de type à l’exécution', async () => {
  const e = await raises(() => evaluate(['+', 'red', 1]), 'chaîne dans une addition', TypeError);
  eq(e.message, 'nombre attendu', 'message');
  await raises(() => evaluate(['rgb', 'a', 0, 0]), 'chaîne dans rgb', TypeError);
});

await run();
