import { eq, run, test } from './spec.ts';
import { add, firstWord, lastItem, setStatus } from './helpers.ts';

test('add : additionne', () => {
  eq(add(2, 3), 5, 'add(2, 3)');
});

test('firstWord : premier mot, vide si absent', () => {
  eq(firstWord('  bonjour le monde '), 'bonjour', "firstWord('  bonjour le monde ')");
  eq(firstWord(''), '', "firstWord('')");
  eq(firstWord(null), '', 'firstWord(null)');
});

test('lastItem : dernier élément ou undefined', () => {
  eq(lastItem(['past', 'present', 'future']), 'future', 'lastItem(tenses)');
  eq(lastItem([]), undefined, 'lastItem([])');
});

test('setStatus : écrit dans l’élément quand il existe', () => {
  const el = { textContent: null as string | null };
  eq(setStatus(el, 'Prêt'), true, "setStatus(el, 'Prêt')");
  eq(el.textContent, 'Prêt', "el.textContent après setStatus");
});

test('setStatus : un élément absent (null) ne plante pas', () => {
  eq(setStatus(null, 'Prêt'), false, "setStatus(null, 'Prêt')");
});

await run();
