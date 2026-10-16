import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, array, boolean, literal, number, object, optional, string, union } from './parse.ts';

test('M1 literal : accepte exactement la valeur', async () => {
  eq(literal('admin').parse('admin'), 'admin', "literal('admin')");
  eq(literal(3).parse(3), 3, 'literal(3)');
  eq(literal(null).parse(null), null, 'literal(null)');
  const e = await raises(() => literal('admin').parse('user'), "literal('admin').parse('user')", ParseError);
  eq(e.path, '$', 'chemin');
  check(e.message.includes('"admin"'), 'le message doit citer la valeur attendue : "admin"');
  await raises(() => literal(1).parse('1'), "literal(1).parse('1')", ParseError);
});

test('M2 union : le premier schéma qui accepte gagne', () => {
  const id = union(string(), number());
  eq(id.parse('abc'), 'abc', "id.parse('abc')");
  eq(id.parse(42), 42, 'id.parse(42)');
  const role = union(literal('admin'), literal('user'));
  eq(role.parse('user'), 'user', "role.parse('user')");
});

test('M2 union : aucune variante → ParseError qui cite chaque raison', async () => {
  const role = union(literal('admin'), literal('user'));
  const e = await raises(() => role.parse('root'), "role.parse('root')", ParseError);
  check(e.message.includes('aucune variante ne convient'), 'message attendu : « aucune variante ne convient (…) »');
  check(e.message.includes('"admin"') && e.message.includes('"user"'), 'le message doit contenir la raison de chaque variante');
});

test('M2 union dans un objet : le chemin est conservé', async () => {
  const schema = object({ role: union(literal('a'), literal('b')) });
  const e = await raises(() => schema.parse({ role: 'c' }), 'rôle invalide', ParseError);
  eq(e.path, '$.role', 'chemin');
});

test('M3 array : valide chaque élément et rapporte l’indice', async () => {
  eq(array(number()).parse([1, 2, 3]), [1, 2, 3], 'array(number())');
  eq(array(string()).parse([]), [], 'tableau vide');
  const e = await raises(() => array(number()).parse([1, 'x', 3]), 'élément invalide', ParseError);
  eq(e.path, '$[1]', 'chemin de l’élément');
  await raises(() => array(number()).parse('abc'), 'pas un tableau', ParseError);
  await raises(() => array(number()).parse({ length: 0 }), 'objet à length', ParseError);
});

test('M3 array imbriqué dans un objet', async () => {
  const schema = object({ tags: array(string()), points: array(object({ x: number() })), flag: optional(boolean()) });
  eq(schema.parse({ tags: ['a'], points: [{ x: 1 }] }), { tags: ['a'], points: [{ x: 1 }], flag: undefined }, 'objet complet');
  const e = await raises(() => schema.parse({ tags: ['a'], points: [{ x: 1 }, { x: 'z' }] }), 'point invalide', ParseError);
  eq(e.path, '$.points[1].x', 'chemin imbriqué');
});

await run();
