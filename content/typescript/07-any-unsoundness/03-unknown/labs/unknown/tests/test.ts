import { eq, raises, run, test } from './spec.ts';
import { describe, isBook, parseJSON, readBooks } from './books.ts';

test('parseJSON', async () => {
  eq(parseJSON('{"a":1}'), { a: 1 }, 'objet');
  eq((await raises(() => parseJSON('{'), 'invalide')).message, 'JSON invalide', 'message');
});

test('isBook', () => {
  eq(isBook({ title: 'Dune', author: 'Herbert', year: 1965 }), true, 'livre minimal');
  eq(isBook({ title: 'Dune', author: 'Herbert', year: 1965, tags: ['sf'] }), true, 'avec tags');
  eq(isBook({ title: '', author: 'X', year: 1 }), false, 'titre vide');
  eq(isBook({ title: 'Dune', author: 'Herbert', year: 1965.5 }), false, 'année non entière');
  eq(isBook({ title: 'Dune', author: 'Herbert', year: 1965, tags: [1] }), false, 'tags invalides');
  eq(isBook({ title: 'Dune', year: 1965 }), false, 'sans auteur');
  eq(isBook(null), false, 'null');
  eq(isBook('Dune'), false, 'chaîne');
});

test('readBooks', async () => {
  const text = JSON.stringify([{ title: 'Dune', author: 'Herbert', year: 1965 }, { title: 'X' }, 42, { title: 'Emma', author: 'Austen', year: 1815 }]);
  const { books, rejected } = readBooks(text);
  eq(books.map((b) => b.title), ['Dune', 'Emma'], 'livres valides');
  eq(rejected, 2, 'rejetés');
  eq((await raises(() => readBooks('{"title":"Dune"}'), 'pas un tableau')).message, 'un tableau est attendu', 'message');
});

test('describe', () => {
  eq(describe({ title: 'Dune', author: 'Herbert', year: 1965 }), 'livre : Dune (1965)', 'livre');
  eq(describe([1, 2, 3]), 'liste de 3 élément(s)', 'liste');
  eq(describe('abc'), 'texte : abc', 'texte');
  eq(describe(4), 'nombre : 4', 'nombre');
  eq(describe(null), 'rien', 'null');
  eq(describe(undefined), 'rien', 'undefined');
  eq(describe({ a: 1 }), 'autre', 'objet quelconque');
});

await run();
