import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, number, object, refine, string, withDefault, enumeration } from './parse.ts';

test('M1 enumeration : accepte les valeurs de la liste', async () => {
  const role = enumeration(['admin', 'editor', 'viewer']);
  eq(role.parse('editor'), 'editor', "role.parse('editor')");
  eq(role.options, ['admin', 'editor', 'viewer'], 'options');
  for (const bad of ['Admin', '', 1, null, undefined]) {
    await raises(() => role.parse(bad), `role.parse(${JSON.stringify(bad)})`, ParseError);
  }
  const e = await raises(() => object({ role }).parse({ role: 'root' }), 'valeur inconnue', ParseError);
  eq(e.path, '$.role', 'chemin');
  check(e.message.includes('admin, editor, viewer'), 'le message liste les valeurs permises');
});

test('M2 refine : le type guard filtre', async () => {
  const email = refine(string(), (s): s is `${string}@${string}` => /^[^@\s]+@[^@\s]+$/.test(s), 'un e-mail est attendu');
  eq(email.parse('ada@example.com'), 'ada@example.com', 'e-mail valide');
  const e = await raises(() => email.parse('ada'), 'e-mail invalide', ParseError);
  check(e.message.includes('un e-mail est attendu'), 'message du raffinement');
  await raises(() => email.parse(42), 'le schéma de base valide d’abord', ParseError);
});

test('M2 refine : chemin dans un objet', async () => {
  const positive = refine(number(), (n): n is number => n > 0, 'un nombre positif est attendu');
  const e = await raises(() => object({ qty: positive }).parse({ qty: -1 }), 'négatif', ParseError);
  eq(e.path, '$.qty', 'chemin');
});

test('M3 withDefault', async () => {
  const settings = object({ theme: withDefault(enumeration(['dark', 'light']), 'dark'), size: withDefault(number(), 14) });
  eq(settings.parse({}), { theme: 'dark', size: 14 }, 'valeurs par défaut');
  eq(settings.parse({ theme: 'light', size: 16 }), { theme: 'light', size: 16 }, 'valeurs fournies');
  await raises(() => settings.parse({ size: 'grand' }), 'une valeur fournie est validée', ParseError);
  eq(withDefault(number(), 0).parse(undefined), 0, 'undefined → défaut');
  await raises(() => withDefault(number(), 0).parse(null), 'null n’est pas undefined', ParseError);
});

await run();
