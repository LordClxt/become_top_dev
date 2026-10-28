import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, raises, run, test } from './spec.js';
import { AppModule, AuditService } from './app.js';
import { RequestContext } from './context.js';

async function withApp(body: (http: ReturnType<typeof request>, audit: AuditService) => Promise<void>) {
  AuditService.instances = 0;
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()), ref.get(AuditService));
  } finally {
    await app.close();
  }
}

test('chaque requête garde son identifiant, même en parallèle', () => withApp(async (http, audit) => {
  const ids = ['a', 'b', 'c', 'd'];
  const res = await Promise.all(ids.map((id) => http.get('/orders').set('x-request-id', id)));
  eq(res.map((r) => r.body.requestId), ids, 'identifiants renvoyés');
  eq(res.map((r) => r.headers['x-request-id']), ids, 'en-têtes x-request-id');
  eq([...audit.lines].sort(), ids.map((id) => `[${id}] liste des commandes`), 'lignes d\'audit');
}));

test('un identifiant est généré si le client n\'en envoie pas', () => withApp(async (http) => {
  const res = await http.get('/orders');
  check(/^req_\d+$/.test(res.body.requestId), `req_<n> attendu, obtenu ${JSON.stringify(res.body.requestId)}`);
}));

test('tout reste singleton', () => withApp(async (http) => {
  await Promise.all([1, 2, 3].map(() => http.get('/orders')));
  eq(AuditService.instances, 1, 'instances d\'AuditService');
}));

test('hors requête, le contexte refuse de répondre', async () => {
  await raises(() => new RequestContext().requestId, 'lecture hors requête');
  const src = readFileSync(new URL('./context.js', import.meta.url), 'utf8');
  check(!/Scope\.REQUEST|\bREQUEST\b/.test(src), 'RequestContext ne doit pas être request-scoped');
});

await run();
