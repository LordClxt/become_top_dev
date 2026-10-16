import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { AppModule, BooksService, CatalogModule, Clock, createApp, HealthModule, SEED } from './app.js';

class FakeClock {
  t = 1_000_000;
  now() {
    return this.t;
  }
}

async function boot(imports: unknown[], clock?: FakeClock) {
  let builder = Test.createTestingModule({ imports: imports as never[] });
  if (clock) builder = builder.overrideProvider(Clock).useValue(clock);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return { app, moduleRef };
}

test('M1 GET /health renvoie { status, uptimeS } calculé avec Clock', async () => {
  const clock = new FakeClock();
  const { app } = await boot([HealthModule], clock);
  try {
    let res = await request(app.getHttpServer()).get('/health');
    eq(res.status, 200, 'statut de GET /health');
    eq(res.body, { status: 'ok', uptimeS: 0 }, 'corps juste après le démarrage');
    clock.t += 61_900;
    res = await request(app.getHttpServer()).get('/health');
    eq(res.body.uptimeS, 61, 'uptimeS après 61,9 s (entier, arrondi vers le bas)');
  } finally {
    await app.close();
  }
});

test('M2 GET /books trie par titre sans modifier SEED', async () => {
  const before = SEED.map((b) => b.title);
  const { app } = await boot([CatalogModule]);
  try {
    const res = await request(app.getHttpServer()).get('/books');
    eq(res.status, 200, 'statut de GET /books');
    eq(res.body.map((b: { title: string }) => b.title),
      ['Bel-Ami', 'Germinal', "L'Étranger", 'Les Misérables'], 'ordre des titres');
    eq(SEED.map((b) => b.title), before, 'SEED ne doit pas être modifié');
  } finally {
    await app.close();
  }
});

test('M2 GET /books/count et service exporté', async () => {
  const { app, moduleRef } = await boot([AppModule]);
  try {
    const res = await request(app.getHttpServer()).get('/books/count');
    eq(res.body, { count: 4 }, 'corps de GET /books/count');
    check(moduleRef.get(BooksService, { strict: false }) instanceof BooksService, 'BooksService doit être un provider');
  } finally {
    await app.close();
  }
});

test('M3 createApp : /api/books préfixé, /health à la racine', async () => {
  const app = await createApp();
  await app.init();
  try {
    const server = app.getHttpServer();
    eq((await request(server).get('/api/books')).status, 200, 'statut de GET /api/books');
    eq((await request(server).get('/books')).status, 404, 'GET /books sans préfixe doit renvoyer 404');
    eq((await request(server).get('/health')).status, 200, 'statut de GET /health (hors préfixe)');
    eq((await request(server).get('/api/health')).status, 404, 'GET /api/health doit renvoyer 404');
  } finally {
    await app.close();
  }
});

await run();
