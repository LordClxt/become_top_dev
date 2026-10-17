import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, camelize, merge, number, object, startsWith, string } from './parse.ts';

test('M1 merge', async () => {
  const base = object({ id: number(), name: string() });
  const extra = object({ name: number(), admin: string() });
  const merged = merge(base, extra);
  eq(Object.keys(merged.shape), ['id', 'name', 'admin'], 'clés');
  eq(merged.parse({ id: 1, name: 2, admin: 'oui' }), { id: 1, name: 2, admin: 'oui' }, 'b l’emporte');
  await raises(() => merged.parse({ id: 1, name: 'Ada', admin: 'oui' }), 'name est désormais un nombre', ParseError);
});

test('M2 camelize', async () => {
  const user = camelize(object({ first_name: string(), last_login_at: number(), id: number() }));
  eq(user.parse({ first_name: 'Ada', last_login_at: 5, id: 1 }), { firstName: 'Ada', lastLoginAt: 5, id: 1 }, 'renommage');
  const e = await raises(() => user.parse({ first_name: 1, last_login_at: 5, id: 1 }), 'invalide', ParseError);
  eq(e.path, '$.first_name', 'le chemin garde le nom d’entrée');
});

test('M3 startsWith', async () => {
  const url = startsWith('https://');
  eq(url.parse('https://example.com'), 'https://example.com', 'valide');
  const e = await raises(() => url.parse('http://example.com'), 'http', ParseError);
  check(e.message.includes('"https://"'), 'message');
  await raises(() => url.parse(42), 'pas une chaîne', ParseError);
});

await run();
