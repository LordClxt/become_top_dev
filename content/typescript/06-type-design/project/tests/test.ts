import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, array, json, lazy, numberIn, object, string } from './parse.ts';
import type { Schema } from './parse.ts';

test('M1 numberIn : bornes et entiers', async () => {
  const percent = numberIn({ min: 0, max: 100 });
  eq(percent.parse(0), 0, '0');
  eq(percent.parse(100), 100, '100');
  eq(percent.parse(12.5), 12.5, '12.5');
  check((await raises(() => percent.parse(-1), '-1', ParseError)).message.includes('≥ 0'), 'message min');
  check((await raises(() => percent.parse(101), '101', ParseError)).message.includes('≤ 100'), 'message max');
  const qty = numberIn({ integer: true, min: 1 });
  check((await raises(() => qty.parse(1.5), '1.5', ParseError)).message.includes('entier'), 'message entier');
  await raises(() => qty.parse('2'), 'une chaîne', ParseError);
  eq(numberIn({}).parse(-5), -5, 'sans contrainte');
});

test('M2 json : valeurs valides', () => {
  const value = { a: [1, 'x', true, null, { b: [] }], c: -2.5 };
  eq(json().parse(value), value, 'objet imbriqué');
  eq(json().parse(null), null, 'null');
  eq(json().parse(Object.create(null)), {}, 'objet sans prototype');
});

test('M2 json : valeurs refusées', async () => {
  for (const bad of [undefined, () => 1, new Date(), NaN, Infinity, new Map(), 10n]) {
    await raises(() => json().parse(bad), `json().parse(${String(bad)})`, ParseError);
  }
  const e = await raises(() => json().parse([1, { a: undefined }]), 'undefined imbriqué', ParseError);
  eq(e.path, '$[1].a', 'chemin');
});

interface Category { name: string; children: Category[] }

test('M3 lazy : un schéma récursif', async () => {
  const category: Schema<Category> = lazy(() => object({ name: string(), children: array(category) }));
  const tree = { name: 'racine', children: [{ name: 'a', children: [] }, { name: 'b', children: [{ name: 'b1', children: [] }] }] };
  eq(category.parse(tree), tree, 'arbre');
  const e = await raises(() => category.parse({ name: 'r', children: [{ name: 'x', children: [{ name: 1, children: [] }] }] }), 'feuille invalide', ParseError);
  eq(e.path, '$.children[0].children[0].name', 'chemin profond');
});

test('M3 lazy : la fabrique est appelée une seule fois, à la demande', () => {
  let calls = 0;
  const s = lazy(() => { calls++; return string(); });
  eq(calls, 0, 'pas encore appelée');
  s.parse('a');
  s.parse('b');
  eq(calls, 1, 'appelée une fois');
});

await run();
