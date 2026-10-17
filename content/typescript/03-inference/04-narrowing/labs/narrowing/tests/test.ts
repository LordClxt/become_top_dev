import { eq, run, test } from './spec.ts';
import { area, compact, describe, inBoundingBox, increment, isDefined } from './narrow.ts';

test('describe', () => {
  eq(describe(null), 'rien', 'describe(null)');
  eq(describe(''), 'texte (0)', "describe('')");
  eq(describe('abc'), 'texte (3)', "describe('abc')");
  eq(describe(0), 'nombre 0', 'describe(0)');
  eq(describe(42), 'nombre 42', 'describe(42)');
  eq(describe(new Date('2024-03-15T12:00:00Z')), 'date 2024-03-15', 'describe(date)');
  eq(describe([1, 2]), 'liste de 2', 'describe([1, 2])');
});

test('isDefined et compact', () => {
  eq(isDefined(0), true, 'isDefined(0)');
  eq(isDefined(''), true, "isDefined('')");
  eq(isDefined(null), false, 'isDefined(null)');
  eq(isDefined(undefined), false, 'isDefined(undefined)');
  eq(compact([1, null, 0, undefined, 3]), [1, 0, 3], 'compact');
});

test('area', () => {
  eq(area({ kind: 'rect', width: 2, height: 3 }), 6, 'rectangle');
  eq(area({ kind: 'square', side: 4 }), 16, 'carré');
  eq(Math.round(area({ kind: 'circle', radius: 1 }) * 1000), 3142, 'cercle');
});

test('inBoundingBox', () => {
  const bbox = { x: [0, 10] as [number, number], y: [0, 5] as [number, number] };
  eq(inBoundingBox({ exterior: [] }, { x: 1, y: 1 }), undefined, 'sans bbox');
  eq(inBoundingBox({ exterior: [], bbox }, { x: 1, y: 1 }), true, 'dedans');
  eq(inBoundingBox({ exterior: [], bbox }, { x: 10, y: 5 }), true, 'sur la borne');
  eq(inBoundingBox({ exterior: [], bbox }, { x: 11, y: 1 }), false, 'dehors');
});

test('increment', () => {
  const counts = new Map([['a', 2]]);
  const next = increment(counts, 'a');
  eq(next.get('a'), 3, "compteur de 'a'");
  eq(increment(next, 'b').get('b'), 1, "nouveau mot 'b'");
  eq(counts.get('a'), 2, "la Map d'origine ne change pas");
});

await run();
