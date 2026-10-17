import 'reflect-metadata';
import request from 'supertest';
import { eq, run, test } from './spec.js';
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

test('les livres en vitrine s\'affichent', () => withApp(async (http) => {
  const res = await http.get('/api/v1/books/featured');
  eq([res.status, res.body.length], [200, 3], 'GET /api/v1/books/featured (statut, nombre)');
}));

test('la sonde de santé répond là où l\'orchestrateur l\'attend', () => withApp(async (http) => {
  eq((await http.get('/api/health')).body, { status: 'ok' }, 'GET /api/health');
}));

test('la pagination est juste', () => withApp(async (http) => {
  const p2 = await http.get('/api/v1/books?page=2&limit=10');
  eq([p2.body.page, p2.body.items.length, p2.body.items[0]?.title], [2, 10, 'Livre 11'], 'page 2');
  const p3 = await http.get('/api/v1/books?page=3');
  eq(p3.body.items.map((b: { title: string }) => b.title), ['Livre 21', 'Livre 22', 'Livre 23', 'Livre 24', 'Livre 25'], 'page 3');
  eq((await http.get('/api/v1/books?page=deux')).status, 400, 'page non numérique');
}));

test('un livre précis reste accessible', () => withApp(async (http) => {
  eq((await http.get('/api/v1/books/978-2000000005')).body.title, 'Livre 6', 'GET d\'un ISBN');
}));

await run();
