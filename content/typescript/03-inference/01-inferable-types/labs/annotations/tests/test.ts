import { eq, raises, run, test } from './spec.ts';
import * as q from './quotes.ts';

test('getQuote renvoie toujours une promesse', async () => {
  const p = q.getQuote('MSFT');
  eq(p instanceof Promise, true, "getQuote('MSFT') est une Promise");
  eq(await p, 420.5, "await getQuote('MSFT')");
  const again = q.getQuote('MSFT');
  eq(again instanceof Promise, true, 'une valeur en cache est aussi renvoyée dans une Promise');
  eq(await again, 420.5, 'deuxième appel');
});

test('getQuote met en cache', async () => {
  const before = q.fetchCount;
  await q.getQuote('AAPL');
  await q.getQuote('AAPL');
  await q.getQuote('AAPL');
  eq(q.fetchCount - before, 1, "fetchPrice n'est appelé qu'une fois pour AAPL");
  await raises(() => q.getQuote('NOPE'), "getQuote('NOPE') rejette");
});

test('add', () => {
  eq(q.add({ x: 1, y: 2 }, { x: 10, y: 20 }), { x: 11, y: 22 }, 'add');
});

test('formatProduct', () => {
  eq(q.formatProduct({ id: 7, name: 'Elmo', price: 28.99 }), 'Elmo (#7) : 28.99 €', 'formatProduct');
  eq(q.formatProduct({ id: 1, name: 'Furby', price: 5 }), 'Furby (#1) : 5.00 €', 'formatProduct (prix entier)');
});

test('parseQuantity', () => {
  eq(q.parseQuantity('12'), 12, "parseQuantity('12')");
  eq(q.parseQuantity(' 3 '), 3, "parseQuantity(' 3 ')");
  eq(q.parseQuantity('0'), 0, "parseQuantity('0')");
  for (const bad of ['1.5', '-2', '', 'abc', '4x']) eq(q.parseQuantity(bad), null, `parseQuantity('${bad}')`);
});

await run();
