import { eq, raises, run, test } from './spec.ts';
import { evaluate, propertiesUsed } from './style.ts';

const city = { properties: { name: 'Lyon', population: 520000, capital: false, kind: 'city', area: null } };

test('valeurs, get et mathématiques', () => {
  eq(evaluate(3, city), 3, '3');
  eq(evaluate(true, city), true, 'true');
  eq(evaluate(['get', 'name'], city), 'Lyon', 'get');
  eq(evaluate(['get', 'missing'], city), null, 'propriété absente');
  eq(evaluate(['/', ['get', 'population'], 1000], city), 520, '/');
  eq(evaluate(['-', 5], city), -5, 'moins unaire');
  eq(evaluate(['+', ['-', 10, 4], ['*', 2, 3]], city), 12, 'imbriqué');
});

test('comparaisons', () => {
  eq(evaluate(['>=', ['get', 'population'], 500000], city), true, '>=');
  eq(evaluate(['<=', 1, 0], city), false, '<=');
  eq(evaluate(['==', ['get', 'kind'], 'city'], city), true, '==');
  eq(evaluate(['!=', ['get', 'capital'], false], city), false, '!=');
});

test('case, match, coalesce', () => {
  eq(evaluate(['case', ['get', 'capital'], 'red', ['>', ['get', 'population'], 100000], 'orange', 'grey'], city), 'orange', 'case');
  eq(evaluate(['match', ['get', 'kind'], 'town', 4, 'city', 8, 2], city), 8, 'match');
  eq(evaluate(['match', ['get', 'kind'], 'town', 4, 'village', 3, 2], city), 2, 'match défaut');
  eq(evaluate(['coalesce', ['get', 'area'], ['get', 'missing'], 42], city), 42, 'coalesce');
  eq(evaluate(['coalesce', ['get', 'area']], city), null, 'coalesce tout null');
});

test('erreurs de type', async () => {
  eq((await raises(() => evaluate(['+', ['get', 'name'], 1], city), 'chaîne', TypeError)).message, 'nombre attendu', 'message');
  await raises(() => evaluate(['>', ['get', 'area'], 1], city), 'null', TypeError);
});

test('propertiesUsed', () => {
  eq(propertiesUsed(['case', ['>', ['get', 'population'], 10], ['get', 'name'], ['coalesce', ['get', 'population'], ['get', 'kind']]]),
    ['population', 'name', 'kind'], 'propriétés');
  eq(propertiesUsed(12), [], 'aucune');
});

await run();
