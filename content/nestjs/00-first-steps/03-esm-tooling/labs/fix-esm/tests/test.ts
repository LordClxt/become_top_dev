import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, eq, run, test } from './spec.js';
import { AppModule } from './app.module.js';
import { CatalogService } from './catalog.service.js';
import { http } from './client.js';

async function boot() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return { app, moduleRef };
}

test('GET /catalog : le contrôleur reçoit le service', async () => {
  const { app } = await boot();
  try {
    const res = await http(app).get('/catalog');
    eq(res.status, 200, 'statut de GET /catalog');
    eq(res.body.map((b: { title: string }) => b.title), ["L'Étranger", 'Germinal'], 'titres renvoyés');
  } finally {
    await app.close();
  }
});

test('dataDir() : chemin absolu à côté du module compilé', async () => {
  const { app, moduleRef } = await boot();
  try {
    const dir = moduleRef.get(CatalogService).dataDir();
    check(isAbsolute(dir), `dataDir() doit être absolu, obtenu « ${dir} »`);
    eq(dir, join(dirname(fileURLToPath(import.meta.url)), 'data'), 'dataDir()');
  } finally {
    await app.close();
  }
});

await run();
