import { eq, run, test } from './spec.ts';
import { honorRoll, line, overlaps, rect } from './shapes.ts';

test('rect', () => {
  eq(rect({ topLeft: { x: 25, y: 50 }, size: { width: 75, height: 100 } }), '<rect x="25" y="50" width="75" height="100" opacity="1"/>', 'opacité par défaut');
  eq(rect({ size: { width: 1, height: 2 }, topLeft: { x: 0, y: 0 }, opacity: 0.5 }), '<rect x="0" y="0" width="1" height="2" opacity="0.5"/>', 'opacité 0.5');
});

test('line', () => {
  eq(line({ x: 0, y: 0 }, { x: 10, y: 5 }), '<line x1="0" y1="0" x2="10" y2="5"/>', 'line');
});

test('overlaps', () => {
  eq(overlaps({ start: 1, end: 5 }, { start: 5, end: 9 }), true, 'bornes communes');
  eq(overlaps({ start: 5, end: 9 }, { start: 1, end: 5 }), true, 'commutatif');
  eq(overlaps({ start: 1, end: 4 }, { start: 5, end: 9 }), false, 'disjoints');
  eq(overlaps({ start: 1, end: 10 }, { start: 3, end: 4 }), true, 'inclus');
});

test('honorRoll', () => {
  const rows = [
    { first_name: 'Ada', last_name: 'Lovelace', scores: [18, 17] },
    { first_name: 'Alan', last_name: 'Turing', scores: [19, 20] },
    { first_name: 'Bob', last_name: 'Martin', scores: [10, 12] },
  ];
  eq(honorRoll(rows, 15), ['TURING Alan (19.5)', 'LOVELACE Ada (17.5)'], 'tableau d’honneur');
  eq(honorRoll(rows, 20), [], 'personne');
});

await run();
