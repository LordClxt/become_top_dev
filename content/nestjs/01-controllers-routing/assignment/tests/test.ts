import 'reflect-metadata';
import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({ controllers: [OrdersController], providers: [OrdersService] })
class AppModule {}

type Ctx = { http: ReturnType<typeof request>; moduleRef: TestingModule };

async function withApp(body: (ctx: Ctx) => Promise<void>) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  await app.init();
  try {
    await body({ http: request(app.getHttpServer()), moduleRef });
  } finally {
    await app.close();
  }
}

const ITEMS = [{ isbn: '978-2253004226', qty: 2 }];
const UNKNOWN = '00000000-0000-4000-8000-000000000000';

test('POST /orders : 201, Location, commande en attente', () => withApp(async ({ http }) => {
  const res = await http.post('/orders').send({ items: ITEMS, status: 'shipped' });
  eq(res.status, 201, 'statut de création');
  eq(res.body.status, 'pending', 'une commande créée est en attente, même si le client envoie status');
  eq(res.body.items, ITEMS, 'lignes de la commande');
  eq(res.headers.location, `/orders/${res.body.id}`, 'en-tête Location');
}));

test('POST /orders : corps invalides → 400', () => withApp(async ({ http }) => {
  const bad = [
    {},
    { items: [] },
    { items: [{ isbn: '123', qty: 1 }] },
    { items: [{ isbn: '978-2253004226', qty: 0 }] },
    { items: [{ isbn: '978-2253004226', qty: 11 }] },
    { items: [{ isbn: '978-2253004226', qty: 1.5 }] },
    { items: Array.from({ length: 21 }, () => ({ isbn: '978-2253004226', qty: 1 })) },
  ];
  for (const body of bad) eq((await http.post('/orders').send(body)).status, 400, `POST /orders ${JSON.stringify(body).slice(0, 60)}`);
  eq((await http.get('/orders')).body.length, 0, 'aucune commande invalide ne doit être créée');
}));

test('GET /orders/:id : no-store, 400 sur UUID invalide, 404 si absente', () => withApp(async ({ http }) => {
  const { body: created } = await http.post('/orders').send({ items: ITEMS });
  const res = await http.get(`/orders/${created.id}`);
  eq([res.status, res.body.id], [200, created.id], 'lecture de la commande créée');
  eq(res.headers['cache-control'], 'no-store', 'en-tête Cache-Control');
  eq((await http.get('/orders/42')).status, 400, 'GET /orders/42 (pas un UUID)');
  eq((await http.get(`/orders/${UNKNOWN}`)).status, 404, 'GET /orders/<uuid inconnu>');
}));

test('GET /orders?status= : filtre et validation', () => withApp(async ({ http, moduleRef }) => {
  const a = (await http.post('/orders').send({ items: ITEMS })).body;
  await http.post('/orders').send({ items: ITEMS });
  moduleRef.get(OrdersService).ship(a.id);
  eq((await http.get('/orders')).body.length, 2, 'toutes les commandes sans filtre');
  const shipped = await http.get('/orders?status=shipped');
  eq(shipped.body.map((o: { id: string }) => o.id), [a.id], 'commandes expédiées');
  eq((await http.get('/orders?status=pending')).body.length, 1, 'commandes en attente');
  eq((await http.get('/orders?status=lost')).status, 400, 'GET /orders?status=lost');
}));

test('POST /orders/:id/cancel : 200 et idempotent', () => withApp(async ({ http }) => {
  const { body: created } = await http.post('/orders').send({ items: ITEMS });
  const first = await http.post(`/orders/${created.id}/cancel`);
  eq([first.status, first.body.status], [200, 'cancelled'], 'première annulation');
  const again = await http.post(`/orders/${created.id}/cancel`);
  eq([again.status, again.body.status], [200, 'cancelled'], 'seconde annulation (idempotente)');
}));

test('POST /orders/:id/cancel : 409 si expédiée, 404, 400', () => withApp(async ({ http, moduleRef }) => {
  const { body: created } = await http.post('/orders').send({ items: ITEMS });
  moduleRef.get(OrdersService).ship(created.id);
  const res = await http.post(`/orders/${created.id}/cancel`);
  eq(res.status, 409, 'annuler une commande expédiée');
  check(typeof res.body.message === 'string', 'le 409 doit porter un message');
  eq((await http.post(`/orders/${UNKNOWN}/cancel`)).status, 404, 'annuler une commande inconnue');
  eq((await http.post('/orders/abc/cancel')).status, 400, 'annuler avec un id invalide');
}));

await run();
