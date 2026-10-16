import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import request from 'supertest';
import { check, eq, raises, run, test } from './spec.js';
import { AppModule, createApp } from './app.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = await createApp(AppModule);
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('/books/featured répond par featured()', () => withApp(async (http) => {
  const res = await http.get('/books/featured');
  eq([res.status, res.body.handler], [200, 'featured'], 'GET /books/featured (statut, handler)');
}));

test('/books/stats répond par stats()', () => withApp(async (http) => {
  const res = await http.get('/books/stats');
  eq([res.status, res.body.handler], [200, 'stats'], 'GET /books/stats (statut, handler)');
}));

test('/books/:isbn répond toujours', () => withApp(async (http) => {
  const res = await http.get('/books/978-2253004226');
  eq([res.status, res.body.handler, res.body.book?.title], [200, 'findOne', 'Germinal'], 'GET /books/978-2253004226');
  eq((await http.get('/books/000')).status, 404, 'GET /books/000');
}));

test('/admin/stats sert les statistiques d\'administration', () => withApp(async (http) => {
  const res = await http.get('/admin/stats');
  eq([res.status, res.body.handler, res.body.totalSales], [200, 'adminStats', 460], 'GET /admin/stats');
}));

@Controller('dup')
class DupController {
  @Get() first() { return 1; }
  @Get() second() { return 2; }
}
@Module({ controllers: [DupController] })
class DupModule {}

test('un doublon fait échouer le démarrage', async () => {
  const e = await raises(async () => {
    const app = await createApp(DupModule);
    try {
      await app.init();
    } finally {
      await app.close().catch(() => {});
    }
  }, 'createApp(DupModule) puis init()');
  check(e.message.includes('Duplicate route'), `le message doit mentionner « Duplicate route », obtenu « ${e.message.slice(0, 120)} »`);
});

@Controller('shadow')
class ShadowController {
  @Get(':id') byId() { return 1; }
  @Get(':slug') bySlug() { return 2; }
}
@Module({ controllers: [ShadowController] })
class ShadowModule {}

test('une route masquée fait échouer le démarrage', async () => {
  const e = await raises(async () => {
    const app = await createApp(ShadowModule);
    try {
      await app.init();
    } finally {
      await app.close().catch(() => {});
    }
  }, 'createApp(ShadowModule) puis init()');
  check(e.message.includes('shadowed'), `le message doit signaler une route masquée (shadowed), obtenu « ${e.message.slice(0, 120)} »`);
});

await run();
