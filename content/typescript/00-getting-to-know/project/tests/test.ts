import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, boolean, number, object, optional, string } from './parse.ts';

test('M1 string/number/boolean : acceptent la bonne valeur', () => {
  eq(string().parse('x'), 'x', "string().parse('x')");
  eq(number().parse(3.5), 3.5, 'number().parse(3.5)');
  eq(boolean().parse(false), false, 'boolean().parse(false)');
});

test('M1 les primitives refusent le mauvais type avec une ParseError au chemin $', async () => {
  for (const [name, schema, bad] of [
    ['string', string(), 42], ['number', number(), '1'], ['number', number(), NaN], ['boolean', boolean(), 'true'],
  ] as const) {
    const e = await raises(() => schema.parse(bad), `${name}().parse(${String(bad)})`, ParseError);
    eq(e.path, '$', `chemin de l'erreur de ${name}`);
  }
});

test('M1 safeParse : succès ou échec, sans lever', () => {
  eq(string().safeParse('ok'), { success: true, data: 'ok' }, "safeParse('ok')");
  const failed = number().safeParse('x');
  check(!failed.success && failed.error instanceof ParseError, 'safeParse d’une valeur invalide doit renvoyer { success: false, error: ParseError }');
});

test('M2 object : valide et ne garde que les clés du schéma', () => {
  const user = object({ name: string(), age: number() });
  eq(user.parse({ name: 'Ada', age: 36, secret: 'x' }), { name: 'Ada', age: 36 }, 'object().parse avec clé en trop');
});

test('M2 object : refuse ce qui n’est pas un objet', async () => {
  const user = object({ name: string() });
  for (const bad of [null, undefined, 'x', 3, []]) {
    const e = await raises(() => user.parse(bad), `parse(${JSON.stringify(bad)})`, ParseError);
    eq(e.path, '$', 'chemin');
  }
});

test('M2 object : l’erreur indique le chemin du champ fautif, même imbriqué', async () => {
  const schema = object({ owner: object({ name: string(), age: number() }), active: boolean() });
  const e1 = await raises(() => schema.parse({ owner: { name: 'Ada', age: '36' }, active: true }), 'âge texte', ParseError);
  eq(e1.path, '$.owner.age', 'chemin imbriqué');
  const e2 = await raises(() => schema.parse({ owner: { name: 'Ada', age: 36 } }), 'active manquant', ParseError);
  eq(e2.path, '$.active', 'champ manquant');
  check(e2.message.includes('$.active'), 'le message doit contenir le chemin');
});

test('M3 optional : accepte undefined, valide sinon', async () => {
  const schema = object({ nickname: optional(string()) });
  eq(schema.parse({}), { nickname: undefined }, 'clé absente');
  eq(schema.parse({ nickname: 'ada' }), { nickname: 'ada' }, 'clé présente');
  const e = await raises(() => schema.parse({ nickname: 7 }), 'nickname numérique', ParseError);
  eq(e.path, '$.nickname', 'chemin');
});

test('M3 safeParse sur un objet imbriqué renvoie l’erreur au bon chemin', () => {
  const schema = object({ items: object({ qty: number() }) });
  const r = schema.safeParse({ items: { qty: 'beaucoup' } });
  check(!r.success && r.error.path === '$.items.qty', 'safeParse doit rapporter $.items.qty');
});

await run();
