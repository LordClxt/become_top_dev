import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import request from 'supertest';
import { check, eq, raises, run, test } from './spec.js';
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

const NEW = { isbn: '978-2070409189', title: 'Madame Bovary', author: 'Gustave Flaubert' };

test('M1 GET /api/v1/books et /health', () => withApp(async (http) => {
  const res = await http.get('/api/v1/books');
  eq(res.status, 200, 'statut de GET /api/v1/books');
  eq(res.body.map((b: { title: string }) => b.title), ['Bel-Ami', 'Germinal', "L'Étranger", 'Les Misérables'], 'titres triés');
  eq((await http.get('/health')).status, 200, 'GET /health');
  eq((await http.get('/api/v1/health')).status, 404, 'GET /api/v1/health');
  eq((await http.get('/api/books')).status, 404, 'GET /api/books (sans version)');
}));

test('M1 GET /api/v1/books/:isbn', () => withApp(async (http) => {
  eq((await http.get('/api/v1/books/978-2253004226')).body.title, 'Germinal', 'titre du livre');
  eq((await http.get('/api/v1/books/978-0000000000')).status, 404, 'ISBN inconnu');
}));

test('M1 POST /api/v1/books : 201, Location, 409', () => withApp(async (http) => {
  const res = await http.post('/api/v1/books').send({ ...NEW, featured: true });
  eq(res.status, 201, 'statut de création');
  eq(res.headers.location, `/api/v1/books/${NEW.isbn}`, 'en-tête Location');
  eq(res.body.featured, false, 'le client ne choisit pas featured (champ inconnu du schéma)');
  eq((await http.post('/api/v1/books').send(NEW)).status, 409, 'second POST du même ISBN');
}));

test('M1 POST /api/v1/books : corps invalides → 400', () => withApp(async (http) => {
  for (const body of [{}, { ...NEW, isbn: '123' }, { ...NEW, title: '' }, { isbn: NEW.isbn, title: 'x' }]) {
    eq((await http.post('/api/v1/books').send(body)).status, 400, `POST ${JSON.stringify(body).slice(0, 60)}`);
  }
}));

test('M1 DELETE /api/v1/books/:isbn : 204 puis 404', () => withApp(async (http) => {
  const res = await http.delete('/api/v1/books/978-2253004226');
  eq([res.status, res.text], [204, ''], 'DELETE (statut, corps)');
  eq((await http.delete('/api/v1/books/978-2253004226')).status, 404, 'second DELETE');
}));

test('M2 GET /api/v2/books : enveloppe paginée', () => withApp(async (http) => {
  const res = await http.get('/api/v2/books?limit=3');
  eq(res.status, 200, 'statut');
  eq([res.body.page, res.body.limit, res.body.total, res.body.items.length], [1, 3, 4, 3], '[page, limit, total, items.length]');
  const p2 = await http.get('/api/v2/books?limit=3&page=2');
  eq(p2.body.items.map((b: { title: string }) => b.title), ['Les Misérables'], 'page 2');
  check(Array.isArray((await http.get('/api/v1/books')).body), 'la v1 doit toujours renvoyer un tableau');
}));

test('M2 GET /api/v2/books : filtre et validation', () => withApp(async (http) => {
  const res = await http.get('/api/v2/books?author=ZOLA');
  eq(res.body.items.map((b: { title: string }) => b.title), ['Germinal'], 'filtre par auteur');
  for (const q of ['page=0', 'page=x', 'limit=51', 'limit=0']) eq((await http.get(`/api/v2/books?${q}`)).status, 400, `?${q}`);
}));

test('M3 GET /api/v1/books/featured', () => withApp(async (http) => {
  const res = await http.get('/api/v1/books/featured');
  eq(res.status, 200, 'statut de GET /api/v1/books/featured');
  check(Array.isArray(res.body), 'featured doit renvoyer un tableau (et non un 404 de findOne)');
  eq(res.body.map((b: { title: string }) => b.title), ["L'Étranger", 'Les Misérables'], 'livres mis en avant');
}));

@Controller('dup') class DupController { @Get() a() { return 1; } @Get() b() { return 2; } }
@Module({ controllers: [DupController] }) class DupModule {}
@Controller('shadow') class ShadowController { @Get(':id') a() { return 1; } @Get(':slug') b() { return 2; } }
@Module({ controllers: [ShadowController] }) class ShadowModule {}

async function boots(module: unknown) {
  const app = await createApp(module);
  try {
    await app.init();
  } finally {
    await app.close().catch(() => {});
  }
}

test('M3 createApp refuse un doublon et une route masquée', async () => {
  const dup = await raises(() => boots(DupModule), 'createApp(DupModule)');
  check(dup.message.includes('Duplicate route'), `doublon : obtenu « ${dup.message.slice(0, 100)} »`);
  const shadow = await raises(() => boots(ShadowModule), 'createApp(ShadowModule)');
  check(shadow.message.includes('shadowed'), `route masquée : obtenu « ${shadow.message.slice(0, 100)} »`);
});

await run();
