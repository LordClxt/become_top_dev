import { check, eq, run, test } from './spec.ts';
import { getAuthors, length } from './authors.ts';

test('length : 2D', () => {
  eq(length({ x: 3, y: 4 }), 5, 'length({x: 3, y: 4})');
});

test('length : 3D, z compte', () => {
  eq(length({ x: 1, y: 2, z: 2 }), 3, 'length({x: 1, y: 2, z: 2})');
});

test('getAuthors : filtre sur les actifs et trie les noms', async () => {
  const calls: { sql: string; params: readonly unknown[] }[] = [];
  const fake = {
    async runQuery(sql: string, params: readonly unknown[]) {
      calls.push({ sql, params });
      return [{ name: 'Zola' }, { name: 'Camus' }, { name: 'Hugo' }];
    },
  };
  eq(await getAuthors(fake), ['Camus', 'Hugo', 'Zola'], 'getAuthors(fake)');
  eq(calls.length, 1, 'nombre de requêtes');
  check(/authors/i.test(calls[0]!.sql), 'la requête doit viser la table authors');
  eq(calls[0]!.params, [true], 'paramètres de la requête (WHERE active = $1)');
});

test('getAuthors : aucune ligne', async () => {
  eq(await getAuthors({ runQuery: async () => [] }), [], 'getAuthors(base vide)');
});

await run();
