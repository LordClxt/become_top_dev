import 'reflect-metadata';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { createApp } from './app.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = await createApp();
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('GET /api/v1/books : tableau', () => withApp(async (http) => {
  const res = await http.get('/api/v1/books');
  eq(res.status, 200, 'statut de GET /api/v1/books');
  check(Array.isArray(res.body), 'v1 doit renvoyer un tableau');
  eq(res.body.length, 2, 'nombre de livres');
}));

test('GET /api/v2/books : { items, total }', () => withApp(async (http) => {
  const res = await http.get('/api/v2/books');
  eq(res.status, 200, 'statut de GET /api/v2/books');
  eq([Array.isArray(res.body.items), res.body.total], [true, 2], '[items est un tableau, total]');
}));

test('count : servi en v1 et en v2', () => withApp(async (http) => {
  for (const v of ['v1', 'v2']) {
    const res = await http.get(`/api/${v}/books/count`);
    eq([res.status, res.body.count], [200, 2], `GET /api/${v}/books/count`);
  }
}));

test('GET /api/books sans version : 404', () => withApp(async (http) => {
  eq((await http.get('/api/books')).status, 404, 'GET /api/books');
  eq((await http.get('/v1/books')).status, 404, 'GET /v1/books (sans préfixe)');
}));

test('sonde de santé : /health uniquement', () => withApp(async (http) => {
  eq((await http.get('/health')).status, 200, 'GET /health');
  eq((await http.get('/api/health')).status, 404, 'GET /api/health');
  eq((await http.get('/v1/health')).status, 404, 'GET /v1/health');
  eq((await http.get('/api/v1/health')).status, 404, 'GET /api/v1/health');
}));

await run();
