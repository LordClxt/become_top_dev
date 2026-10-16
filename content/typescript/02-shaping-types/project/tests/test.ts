import { check, eq, raises, run, test } from './spec.ts';
import { ParseError, boolean, number, object, partial, pick, record, string, tuple } from './parse.ts';

test('M1 tuple : longueur fixe, un schéma par position', async () => {
  const point = tuple(number(), number());
  eq(point.parse([1, 2]), [1, 2], 'point valide');
  const labelled = tuple(string(), number(), boolean());
  eq(labelled.parse(['x', 1, true]), ['x', 1, true], 'triplet valide');
  for (const bad of [[1], [1, 2, 3], 'ab', null, {}]) {
    await raises(() => point.parse(bad), `point.parse(${JSON.stringify(bad)})`, ParseError);
  }
  const e = await raises(() => point.parse([1, 'x']), 'second élément invalide', ParseError);
  eq(e.path, '$[1]', 'chemin');
  check(e.message.includes('$[1]'), 'le message contient le chemin');
});

test('M1 tuple message de longueur', async () => {
  const e = await raises(() => tuple(number(), number()).parse([1]), 'trop court', ParseError);
  check(e.message.includes('2 éléments'), 'message attendu : « un tableau de 2 éléments est attendu »');
});

test('M2 record : une Map, valeurs validées, chemin par clé', async () => {
  const scores = record(number());
  const parsed = scores.parse({ ada: 10, grace: 20 });
  check(parsed instanceof Map, 'record doit produire une Map');
  eq([...parsed], [['ada', 10], ['grace', 20]], 'entrées');
  eq(scores.parse({}).size, 0, 'objet vide');
  const e = await raises(() => scores.parse({ ada: 10, bob: 'x' }), 'valeur invalide', ParseError);
  eq(e.path, '$.bob', 'chemin');
  await raises(() => scores.parse([1, 2]), 'tableau refusé', ParseError);
  await raises(() => scores.parse(null), 'null refusé', ParseError);
});

test('M2 record : les clés héritées du prototype ne perturbent pas', () => {
  const m = record(number()).parse({ constructor: 1, toString: 2 });
  eq(m.get('constructor'), 1, 'constructor');
  eq(m.get('toString'), 2, 'toString');
  eq(m.get('valueOf'), undefined, 'valueOf absent');
});

test('M3 pick : ne valide que les champs demandés', async () => {
  const user = object({ name: string(), age: number(), admin: boolean() });
  const summary = pick(user, ['name', 'age']);
  eq(summary.parse({ name: 'Ada', age: 36, admin: 'peu importe' }), { name: 'Ada', age: 36 }, 'pick');
  eq(Object.keys(summary.shape), ['name', 'age'], 'shape du schéma dérivé');
  const e = await raises(() => summary.parse({ name: 'Ada' }), 'age manquant', ParseError);
  eq(e.path, '$.age', 'chemin');
});

test('M3 partial : chaque champ accepte undefined', async () => {
  const user = object({ name: string(), age: number() });
  const draft = partial(user);
  eq(draft.parse({}), { name: undefined, age: undefined }, 'objet vide');
  eq(draft.parse({ name: 'Ada' }), { name: 'Ada', age: undefined }, 'un champ');
  const e = await raises(() => draft.parse({ age: 'x' }), 'valeur invalide quand présente', ParseError);
  eq(e.path, '$.age', 'chemin');
  await raises(() => user.parse({}), 'le schéma d’origine reste strict', ParseError);
});

await run();
