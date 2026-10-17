import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, array, number, object, partition, refineAsync, string, transform } from './parse.ts';

test('M1 transform : convertit après validation', async () => {
  const date = transform(string(), (s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) throw new Error('date invalide');
    return d;
  });
  const parsed = date.parse('2024-03-15T00:00:00Z');
  check(parsed instanceof Date, 'une Date est produite');
  eq(parsed.toISOString(), '2024-03-15T00:00:00.000Z', 'valeur');
  const e = await raises(() => object({ at: date }).parse({ at: 'hier' }), 'date invalide', ParseError);
  eq(e.path, '$.at', 'chemin');
  check(e.message.includes('date invalide'), 'message de la transformation');
  await raises(() => date.parse(42), 'le schéma de base valide d’abord', ParseError);
});

test('M1 transform : se compose', () => {
  const length = transform(transform(string(), (s) => s.trim()), (s) => s.length);
  eq(length.parse('  abc '), 3, 'trim puis length');
  eq(array(length).parse(['a', ' bb ']), [1, 2], 'dans un tableau');
});

test('M2 partition : sépare valides et erreurs', () => {
  const user = object({ name: string(), age: number() });
  const { valid, errors } = partition(user, [{ name: 'Ada', age: 36 }, { name: 'Bob' }, 'x', { name: 'Cy', age: 20 }]);
  eq(valid, [{ name: 'Ada', age: 36 }, { name: 'Cy', age: 20 }], 'valides');
  eq(errors.map((e) => e.path), ['$[1].age', '$[2]'], 'chemins des erreurs');
  check(errors.every((e) => e instanceof ParseError), 'des ParseError');
  eq(partition(number(), []), { valid: [], errors: [] }, 'liste vide');
});

test('M3 refineAsync : attend la vérification', async () => {
  const taken = new Set(['ada']);
  const username = refineAsync(string(), async (s) => !taken.has(s), 'nom déjà pris');
  eq(await username.parseAsync('grace'), 'grace', 'nom libre');
  const e = await raises(() => username.parseAsync('ada'), 'nom pris', ParseError);
  check(e.message.includes('nom déjà pris'), 'message');
});

test('M3 parseAsync rejette au lieu de lever', async () => {
  const username = refineAsync(string(), async () => true, 'jamais');
  let threw = false;
  let p: Promise<string> | undefined;
  try {
    p = username.parseAsync(42);
  } catch {
    threw = true;
  }
  eq(threw, false, 'aucune exception synchrone');
  check(p instanceof Promise, 'une promesse est renvoyée');
  await raises(() => p!, 'la promesse est rejetée', ParseError);
});

await run();
