import 'reflect-metadata';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { createApp, OrdersModule, PricingModule } from './app.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = await createApp();
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('M1 POST /api/v1/orders → 201 + Location, identifiant préfixé', () => withApp(async (http) => {
  const res = await http.post('/api/v1/orders').send({ isbn: '978-2253004226', quantity: 2 });
  eq(res.status, 201, 'statut');
  check(/^ord_\d+$/.test(res.body.id), `identifiant ord_<n> attendu, obtenu ${JSON.stringify(res.body.id)}`);
  eq(res.headers.location, `/api/v1/orders/${res.body.id}`, 'en-tête Location');
  const again = await http.get(`/api/v1/orders/${res.body.id}`);
  eq([again.status, again.body.isbn, again.body.quantity], [200, '978-2253004226', 2], 'GET de la commande créée');
  eq((await http.get('/api/v1/orders/ord_999')).status, 404, 'commande inconnue');
}));

test('M1 erreurs de commande', () => withApp(async (http) => {
  eq((await http.post('/api/v1/orders').send({ isbn: '978-0000000000', quantity: 1 })).status, 422, 'livre inconnu');
  eq((await http.post('/api/v1/orders').send({ isbn: '978-2253004226', quantity: 0 })).status, 400, 'quantité 0');
}));

test('M1 OrdersModule voit le même catalogue (un seul BooksService)', () => withApp(async (http) => {
  const book = { isbn: '978-2070409189', title: 'Madame Bovary', author: 'Gustave Flaubert' };
  eq((await http.post('/api/v1/books').send(book)).status, 201, 'création du livre');
  eq((await http.post('/api/v1/orders').send({ isbn: book.isbn, quantity: 1 })).status, 201,
    'commander un livre tout juste créé : OrdersModule doit utiliser l\'instance exportée par CatalogModule');
}));

test('M2 total TTC (TVA 5,5 %) fourni par un PricingModule global', () => withApp(async (http) => {
  const res = await http.post('/api/v1/orders').send({ isbn: '978-2253004226', quantity: 3 });
  eq(res.body.totalCents, 3007, 'total de 3 × 9,50 € à 5,5 %');
  const imports = (Reflect.getMetadata('imports', OrdersModule) ?? []) as unknown[];
  check(!imports.some((m) => m === PricingModule || (m as { module?: unknown })?.module === PricingModule),
    'OrdersModule ne doit pas importer PricingModule : il est configuré une fois, globalement, dans AppModule');
}));

test('M3 chaque commande porte l\'identifiant de sa requête', () => withApp(async (http) => {
  const ids = ['r-1', 'r-2', 'r-3'];
  const res = await Promise.all(ids.map((id) =>
    http.post('/api/v1/orders').set('x-request-id', id).send({ isbn: '978-2070413119', quantity: 1 })));
  eq(res.map((r) => r.body.requestId), ids, 'identifiants de requête');
  const anon = await http.post('/api/v1/orders').send({ isbn: '978-2070413119', quantity: 1 });
  check(/^req_\d+$/.test(anon.body.requestId), `req_<n> attendu sans en-tête, obtenu ${JSON.stringify(anon.body.requestId)}`);
}));

test('M3 les commandes survivent à la requête qui les a créées', () => withApp(async (http) => {
  const ids = await Promise.all([1, 2, 3].map(async () =>
    (await http.post('/api/v1/orders').send({ isbn: '978-2070413119', quantity: 1 })).body.id as string));
  eq(new Set(ids).size, 3, 'trois identifiants distincts : le générateur ne doit pas repartir de 1 à chaque requête');
  for (const id of ids) eq((await http.get(`/api/v1/orders/${id}`)).status, 200, `GET ${id}`);
}));

await run();
