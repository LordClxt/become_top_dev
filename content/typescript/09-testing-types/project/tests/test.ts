import { eq, raises, run, test } from './spec.ts';
import { ParseError, fromSpec, looseObject, number, optional, string, toTypeScript, tupleOf } from './parse.ts';

test('M1 looseObject : les undefined disparaissent', async () => {
  const person = looseObject({ name: string(), age: optional(number()) });
  eq(person.parse({ name: 'Ada', age: 36 }), { name: 'Ada', age: 36 }, 'complet');
  eq(person.parse({ name: 'Ada' }), { name: 'Ada' }, 'age absent');
  eq(Object.keys(person.parse({ name: 'Ada', age: undefined })), ['name'], 'pas de clé undefined');
  const e = await raises(() => person.parse({ name: 'Ada', age: 'x' }), 'invalide', ParseError);
  eq(e.path, '$.age', 'chemin');
});

test('M2 tupleOf', async () => {
  const rgb = tupleOf(number(), 3);
  eq(rgb.parse([255, 128, 0]), [255, 128, 0], 'rgb');
  const e = await raises(() => rgb.parse([1, 2]), 'longueur', ParseError);
  eq(e.message.includes('3 éléments'), true, 'message');
  const e2 = await raises(() => rgb.parse([1, 'x', 3]), 'élément invalide', ParseError);
  eq(e2.path, '$[1]', 'chemin');
});

test('M3 fromSpec et toTypeScript', async () => {
  const spec = { name: 'string', tags: 'string[]', age: 'number?', admin: 'boolean' } as const;
  const user = fromSpec(spec);
  eq(user.parse({ name: 'Ada', tags: ['x'], admin: false }), { name: 'Ada', tags: ['x'], admin: false }, 'sans age');
  eq(user.parse({ name: 'Ada', tags: [], age: 36, admin: true }), { name: 'Ada', tags: [], age: 36, admin: true }, 'avec age');
  await raises(() => user.parse({ name: 'Ada', tags: [1], admin: true }), 'tags invalides', ParseError);
  eq(toTypeScript('User', spec), [
    'export interface User {',
    '  name: string;',
    '  tags: string[];',
    '  age?: number;',
    '  admin: boolean;',
    '}',
  ].join('\n'), 'code généré');
});

await run();
