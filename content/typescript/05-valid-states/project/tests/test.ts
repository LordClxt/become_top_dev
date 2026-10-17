import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, discriminatedUnion, isoDate, nullable, number, object, string } from './parse.ts';

test('M1 nullable', async () => {
  const middle = nullable(string());
  eq(middle.parse(null), null, 'null');
  eq(middle.parse('S'), 'S', 'valeur');
  await raises(() => middle.parse(undefined), 'undefined n’est pas null', ParseError);
  await raises(() => middle.parse(3), 'mauvais type', ParseError);
  const e = await raises(() => object({ m: nullable(number()) }).parse({ m: 'x' }), 'chemin', ParseError);
  eq(e.path, '$.m', 'chemin');
});

test('M2 discriminatedUnion : choisit la variante par le tag', () => {
  const shape = discriminatedUnion('kind', { circle: { radius: number() }, rect: { w: number(), h: number() } });
  eq(shape.parse({ kind: 'circle', radius: 2 }), { kind: 'circle', radius: 2 }, 'cercle');
  eq(shape.parse({ kind: 'rect', w: 1, h: 3, extra: true }), { kind: 'rect', w: 1, h: 3 }, 'rectangle (champ inconnu ignoré)');
});

test('M2 discriminatedUnion : erreurs', async () => {
  const shape = discriminatedUnion('kind', { circle: { radius: number() }, rect: { w: number(), h: number() } });
  const e1 = await raises(() => shape.parse({ kind: 'triangle' }), 'tag inconnu', ParseError);
  eq(e1.path, '$.kind', 'chemin du tag');
  check(e1.message.includes('circle, rect'), 'le message liste les variantes');
  await raises(() => shape.parse({ radius: 2 }), 'tag absent', ParseError);
  await raises(() => shape.parse({ kind: 'toString' }), 'clé héritée du prototype refusée', ParseError);
  const e2 = await raises(() => shape.parse({ kind: 'rect', w: 1 }), 'champ manquant', ParseError);
  eq(e2.path, '$.h', 'chemin du champ');
  await raises(() => shape.parse(null), 'null', ParseError);
  await raises(() => shape.parse([]), 'tableau', ParseError);
});

test('M3 isoDate', async () => {
  const d = isoDate().parse('2024-02-29');
  check(d instanceof Date, 'une Date');
  eq(d.toISOString(), '2024-02-29T00:00:00.000Z', 'valeur UTC');
  for (const bad of ['2023-02-29', '2024-13-01', '17/08/1959', 'August 17th, 1959', 20240229, null]) {
    await raises(() => isoDate().parse(bad), `isoDate().parse(${JSON.stringify(bad)})`, ParseError);
  }
});

await run();
