import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { AppModule, CatalogRepository, OrdersService } from './app.js';
import { AUDIT_LINES } from './context.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  CatalogRepository.instances = 0;
  OrdersService.instances = 0;
  AUDIT_LINES.length = 0;
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('chaque requête voit son propre identifiant, même en parallèle', () => withApp(async (http) => {
  const ids = ['a1', 'b2', 'c3', 'd4'];
  const res = await Promise.all(ids.map((id) => http.get('/summary').set('x-request-id', id)));
  eq(res.map((r) => r.body.requestId), ids, 'identifiants renvoyés');
  eq((await http.get('/summary')).body.requestId, 'anonymous', 'requête sans en-tête');
}));

test('la portée REQUEST remonte, mais pas vers le dépôt', () => withApp(async (http) => {
  await Promise.all([1, 2, 3].map(() => http.get('/summary')));
  eq(OrdersService.instances, 3, 'OrdersService dépend du contexte : une instance par requête');
  eq(CatalogRepository.instances, 1, 'CatalogRepository ne dépend pas du contexte : il doit rester un singleton');
}));

test('AuditLogger sait qui l\'utilise (INQUIRER)', () => withApp(async (http) => {
  await http.get('/summary').set('x-request-id', 'z9');
  eq(AUDIT_LINES, ['OrdersService: résumé pour z9'], 'ligne d\'audit');
}));

await run();
