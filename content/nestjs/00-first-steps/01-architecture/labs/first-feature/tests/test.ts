import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { QuotesService } from './quotes.js';
import { AppModule, StatsService } from './stats.js';

async function boot(): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return { app, moduleRef };
}

test('GET /quotes renvoie les trois citations', async () => {
  const { app } = await boot();
  try {
    const res = await request(app.getHttpServer()).get('/quotes');
    eq(res.status, 200, 'statut de GET /quotes');
    check(Array.isArray(res.body), 'le corps doit être un tableau JSON');
    eq(res.body.length, 3, 'nombre de citations');
    eq(res.body[1].author, 'Albert Camus', 'auteur de la 2e citation');
  } finally {
    await app.close();
  }
});

test('GET /quotes/count renvoie { count }', async () => {
  const { app } = await boot();
  try {
    const res = await request(app.getHttpServer()).get('/quotes/count');
    eq(res.status, 200, 'statut de GET /quotes/count');
    eq(res.body, { count: 3 }, 'corps de GET /quotes/count');
  } finally {
    await app.close();
  }
});

test('le service est partagé avec StatsModule (exports)', async () => {
  const { app } = await boot();
  try {
    const res = await request(app.getHttpServer()).get('/stats');
    eq(res.body, { authors: 3 }, 'corps de GET /stats');
  } finally {
    await app.close();
  }
});

test('une seule instance de QuotesService (singleton)', async () => {
  const { app, moduleRef } = await boot();
  try {
    const fromContainer = moduleRef.get(QuotesService, { strict: false });
    const fromStats = moduleRef.get(StatsService, { strict: false }).quotes;
    check(fromContainer === fromStats, 'StatsService doit recevoir la même instance que celle du conteneur');
  } finally {
    await app.close();
  }
});

await run();
