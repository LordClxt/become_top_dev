import { eq, run, test } from './spec.ts';
import { isWeekend, makePerson, swap } from './sets.ts';

test('isWeekend : samedi et dimanche seulement', () => {
  eq(isWeekend('sat'), true, "isWeekend('sat')");
  eq(isWeekend('sun'), true, "isWeekend('sun')");
  eq(isWeekend('mon'), false, "isWeekend('mon')");
  eq(isWeekend('fri'), false, "isWeekend('fri')");
});

test('makePerson : un objet avec name ET age', () => {
  eq(makePerson('Ada', 36), { name: 'Ada', age: 36 }, "makePerson('Ada', 36)");
});

test('swap : échange la paire sans la modifier', () => {
  const pair: [number, number] = [1, 2];
  eq(swap(pair), [2, 1], 'swap([1, 2])');
  eq(pair, [1, 2], 'la paire d’origine ne doit pas changer');
});

await run();
