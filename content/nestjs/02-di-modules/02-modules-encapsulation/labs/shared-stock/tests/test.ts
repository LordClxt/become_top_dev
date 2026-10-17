import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, raises, run, test } from './spec.js';
import { AppModule, CatalogModule, CoreModule, OrdersModule } from './modules.js';
import { PriceService, StockService } from './services.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('une commande diminue le stock vu par le catalogue', () => withApp(async (http) => {
  eq((await http.post('/orders').send({ isbn: '978-2253004226', qty: 2 })).status, 201, 'première commande');
  eq((await http.get('/catalog/978-2253004226')).body.stock, 1, 'stock affiché par le catalogue après la commande');
  eq((await http.post('/orders').send({ isbn: '978-2253004226', qty: 2 })).status, 422, 'commande au-delà du stock');
}));

test('une seule instance de StockService dans toute l\'application', async () => {
  StockService.instances = 0;
  await withApp(async () => {});
  eq(StockService.instances, 1, 'nombre d\'instances de StockService');
});

test('OrdersModule passe par CoreModule, qui ré-exporte le catalogue', () => {
  const imports = (Reflect.getMetadata('imports', OrdersModule) ?? []) as unknown[];
  check(imports.includes(CoreModule) && !imports.includes(CatalogModule),
    'OrdersModule doit importer CoreModule, et non CatalogModule directement');
  eq(Reflect.getMetadata('__module:global__', CatalogModule) ?? false, false, 'CatalogModule ne doit pas être @Global()');
});

test('PriceService reste un détail interne du catalogue', async () => {
  @Injectable()
  class Spy {
    constructor(readonly prices: PriceService) {}
  }
  @Module({ imports: [CoreModule], providers: [Spy] })
  class Outsider {}
  await raises(() => Test.createTestingModule({ imports: [Outsider] }).compile(),
    'un module extérieur ne doit pas pouvoir injecter PriceService');
});

await run();
