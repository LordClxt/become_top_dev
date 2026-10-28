import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { createApp, STAFF_KEY } from './app.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = await createApp();
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

const NEW = { isbn: '978-2070409189', title: 'Madame Bovary', author: 'Gustave Flaubert' };

test('M1 identifiant de requête sans portée par requête', () => withApp(async (http) => {
  const ids = ['r-1', 'r-2', 'r-3'];
  const res = await Promise.all(ids.map((id) =>
    http.post('/api/v1/orders').set('x-request-id', id).send({ isbn: '978-2070413119', quantity: 1 })));
  eq(res.map((r) => r.body.requestId), ids, 'requestId des commandes');
  eq(res.map((r) => r.headers['x-request-id']), ids, 'en-tête x-request-id renvoyé');
  const anon = await http.get('/api/v1/books');
  check(/^req_\d+$/.test(String(anon.headers['x-request-id'])), `x-request-id généré attendu, obtenu ${anon.headers['x-request-id']}`);
  const src = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  check(!/Scope\.REQUEST/.test(src), 'plus aucun provider Scope.REQUEST');
}));

test('M1 les commandes et le générateur restent partagés', () => withApp(async (http) => {
  const ids = await Promise.all([1, 2, 3].map(async () =>
    (await http.post('/api/v1/orders').send({ isbn: '978-2070413119', quantity: 1 })).body.id as string));
  eq(new Set(ids).size, 3, 'trois identifiants distincts');
  for (const id of ids) eq((await http.get(`/api/v1/orders/${id}`)).status, 200, `GET ${id}`);
}));

test('M2 écritures du catalogue réservées aux libraires', () => withApp(async (http) => {
  const anon = await http.post('/api/v1/books').send(NEW);
  eq([anon.status, anon.body.errorCode], [401, 'INVALID_KEY'], 'POST sans clé');
  eq((await http.post('/api/v1/books').set('x-api-key', 'nope').send(NEW)).status, 401, 'mauvaise clé');
  eq((await http.post('/api/v1/books').set('x-api-key', STAFF_KEY).send(NEW)).status, 201, 'POST libraire');
  eq((await http.delete(`/api/v1/books/${NEW.isbn}`)).status, 401, 'DELETE sans clé');
  eq((await http.delete(`/api/v1/books/${NEW.isbn}`).set('x-api-key', STAFF_KEY)).status, 204, 'DELETE libraire');
  eq((await http.get('/api/v1/books')).status, 200, 'lecture publique');
  eq((await http.post('/api/v1/orders').send({ isbn: '978-2070413119', quantity: 1 })).status, 201, 'commande publique');
}));

test('M3 une seule enveloppe d\'erreur, avec l\'identifiant de requête', () => withApp(async (http) => {
  eq((await http.get('/api/v1/books/978-0000000000').set('x-request-id', 'e-1')).body,
    { statusCode: 404, errorCode: 'NOT_FOUND', message: 'Livre 978-0000000000 introuvable', requestId: 'e-1' }, '404 métier');
  const bad = await http.post('/api/v1/orders').set('x-request-id', 'e-2').send({ isbn: '978-2070413119', quantity: 0 });
  eq([bad.status, bad.body.errorCode, bad.body.requestId], [400, 'BAD_REQUEST', 'e-2'], '400 de validation');
  const route = await http.get('/api/v1/nope').set('x-request-id', 'e-3');
  eq([route.status, route.body.errorCode, route.body.requestId], [404, 'NOT_FOUND', 'e-3'], '404 du routeur');
}));

test('M3 chaque succès annonce son temps de réponse', () => withApp(async (http) => {
  const res = await http.get('/api/v1/books');
  check(/^\d+(\.\d)?$/.test(String(res.headers['x-response-time-ms'])), `x-response-time-ms attendu, obtenu ${res.headers['x-response-time-ms']}`);
  eq((await http.get('/health')).status, 200, 'la sonde reste accessible');
}));

await run();
