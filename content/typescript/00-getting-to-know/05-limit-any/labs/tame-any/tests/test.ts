import { eq, run, test } from './spec.ts';
import { ageInYears, labels, longestWord, selectItem } from './inventory.ts';

const items = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
];

test('ageInYears', () => {
  eq(ageInYears(1990, 2024), 34, 'ageInYears(1990, 2024)');
});

test('longestWord : le premier plus long, undefined si vide', () => {
  eq(longestWord(['un', 'trois', 'quatre', 'cinq']), 'quatre', 'longestWord(...)');
  eq(longestWord([]), undefined, 'longestWord([])');
});

test('selectItem', () => {
  eq(selectItem(items, 'b'), items[1], "selectItem(items, 'b')");
  eq(selectItem(items, 'z'), undefined, "selectItem(items, 'z')");
});

test('labels', () => {
  eq(labels(items), ['Alpha', 'Bravo'], 'labels(items)');
});

await run();
