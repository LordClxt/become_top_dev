import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, assertValid, instanceOf, is, number, object, optional, string, strict } from './parse.ts';

test('M1 instanceOf', async () => {
  const d = new Date(0);
  eq(instanceOf(Date).parse(d), d, 'une Date');
  const e = await raises(() => instanceOf(Date).parse('1970-01-01'), 'une chaîne', ParseError);
  check(e.message.includes('Date'), 'le message nomme la classe');
  class Point { x = 1; }
  await raises(() => object({ p: instanceOf(Point) }).parse({ p: { x: 1 } }), 'un objet simple n’est pas une instance', ParseError);
});

test('M2 is : type guard sans exception', () => {
  const user = object({ name: string() });
  eq(is(user, { name: 'Ada' }), true, 'valide');
  eq(is(user, { name: 1 }), false, 'invalide');
  eq(is(user, null), false, 'null');
  const values: unknown[] = [{ name: 'Ada' }, 3, { name: 'Bob' }];
  eq(values.filter((v) => is(user, v)).length, 2, 'filtre');
});

test('M2 assertValid : fonction d’assertion', async () => {
  const value: unknown = { name: 'Ada' };
  assertValid(object({ name: string() }), value);
  eq(value.name, 'Ada', 'après assertion, value est typée');
  await raises(() => assertValid(number(), 'x'), 'invalide', ParseError);
});

test('M3 strict : refuse les propriétés inconnues', async () => {
  const person = strict(object({ name: string(), age: optional(number()) }));
  eq(person.parse({ name: 'Ada', age: 36 }), { name: 'Ada', age: 36 }, 'exact');
  eq(person.parse({ name: 'Ada' }), { name: 'Ada', age: undefined }, 'optionnel absent');
  const e = await raises(() => person.parse({ name: 'Ada', agee: 36 }), 'faute de frappe', ParseError);
  eq(e.path, '$.agee', 'chemin');
  check(e.message.includes('propriété inconnue'), 'message');
  eq(Object.keys(person.shape), ['name', 'age'], 'shape conservée');
  await raises(() => person.parse('x'), 'pas un objet', ParseError);
  eq(object({ name: string() }).parse({ name: 'Ada', extra: 1 }), { name: 'Ada' }, 'object() reste tolérant');
});

await run();
