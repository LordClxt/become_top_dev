import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { AppModule } from './app.js';
import { AuditLog } from './audit.js';

async function withApp(body: (http: ReturnType<typeof request>, log: AuditLog) => Promise<void>) {
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()), ref.get(AuditLog));
  } finally {
    await app.close();
  }
}

const strip = (e: object) => { const { durationMs: _d, ...rest } = e as { durationMs: number }; return rest; };

test('un succès audité', () => withApp(async (http, log) => {
  const res = await http.post('/books/978-2253004226/reserve').set('x-user', 'u1').set('x-request-id', 'r1');
  eq(res.status, 201, 'statut');
  eq(log.entries.map(strip), [{ action: 'book.reserve', userId: 'u1', requestId: 'r1', outcome: 'success' }], 'entrée');
  check(log.entries[0]!.durationMs >= 10, `durée mesurée : ${log.entries[0]!.durationMs} ms`);
}));

test('les échecs sont audités, l\'erreur reste celle du handler', () => withApp(async (http, log) => {
  eq((await http.post('/books/978-2070413119/reserve').set('x-user', 'u2').set('x-request-id', 'r2')).status, 409, '409');
  eq((await http.delete('/books/000').set('x-user', 'u2').set('x-request-id', 'r3')).status, 404, '404');
  eq(log.entries.map(strip), [
    { action: 'book.reserve', userId: 'u2', requestId: 'r2', outcome: 'failure', status: 409 },
    { action: 'book.delete', userId: 'u2', requestId: 'r3', outcome: 'failure', status: 404 },
  ], 'entrées d\'échec');
}));

test('seules les routes @Audited sont journalisées', () => withApp(async (http, log) => {
  await http.get('/books').set('x-user', 'u1');
  eq(log.entries.length, 0, 'entrées après une route non auditée');
}));

test('requêtes parallèles : chaque entrée garde son identifiant', () => withApp(async (http, log) => {
  await Promise.all(['a', 'b', 'c'].map((id) =>
    http.post('/books/978-2253004226/reserve').set('x-user', id).set('x-request-id', `req-${id}`)));
  eq(log.entries.map((e) => `${e.userId}:${e.requestId}`).sort(), ['a:req-a', 'b:req-b', 'c:req-c'], 'couples utilisateur/requête');
}));

await run();
