import { eq, raises, run, test } from './spec.ts';
import { area, asNumber, parseSwitch } from './shapes.ts';
import type { Shape } from './shapes.ts';

test('area : carré, rectangle, cercle', () => {
  eq(area({ kind: 'square', width: 3 }), 9, 'aire du carré de côté 3');
  eq(area({ kind: 'rectangle', width: 2, height: 5 }), 10, 'aire du rectangle 2×5');
  eq(Math.round(area({ kind: 'circle', radius: 2 }) * 1000) / 1000, 12.566, 'aire du cercle de rayon 2');
});

test('area : une forme venue d’un JSON fonctionne aussi', () => {
  const shape = JSON.parse('{"kind":"rectangle","width":4,"height":2}') as Shape;
  eq(area(shape), 8, 'aire d’un rectangle lu depuis du JSON');
});

test('asNumber : convertit vraiment', () => {
  eq(asNumber(42), 42, 'asNumber(42)');
  eq(asNumber('42'), 42, "asNumber('42')");
  eq(asNumber(' 3.5 '), 3.5, "asNumber(' 3.5 ')");
  eq(typeof asNumber('7'), 'number', "typeof asNumber('7')");
});

test('asNumber : refuse ce qui n’est pas un nombre', async () => {
  await raises(() => asNumber('abc'), "asNumber('abc')", RangeError);
  await raises(() => asNumber(''), "asNumber('')", RangeError);
});

test('parseSwitch : booléens et chaînes on/off', () => {
  eq(parseSwitch(true), true, 'parseSwitch(true)');
  eq(parseSwitch(false), false, 'parseSwitch(false)');
  eq(parseSwitch(' ON '), true, "parseSwitch(' ON ')");
  eq(parseSwitch('off'), false, "parseSwitch('off')");
});

test('parseSwitch : refuse le reste, même si le type prétend boolean', async () => {
  await raises(() => parseSwitch('maybe'), "parseSwitch('maybe')", TypeError);
  await raises(() => parseSwitch(1), 'parseSwitch(1)', TypeError);
  await raises(() => parseSwitch(null), 'parseSwitch(null)', TypeError);
});

await run();
