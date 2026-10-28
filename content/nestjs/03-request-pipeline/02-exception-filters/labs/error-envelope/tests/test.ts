import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { AppModule } from './app.js';
import { ErrorEnvelopeFilter } from './errors.filter.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  ErrorEnvelopeFilter.logged = [];
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('exceptions HTTP : enveloppe et code par défaut', () => withApp(async (http) => {
  eq((await http.get('/books/missing')).body,
    { statusCode: 404, errorCode: 'NOT_FOUND', message: 'Livre introuvable', path: '/books/missing' }, '404');
  eq((await http.get('/books/weak')).body.errorCode, 'WEAK_PASSWORD', 'errorCode fourni par l\'exception');
}));

test('erreur métier traduite en 409', () => withApp(async (http) => {
  const res = await http.get('/books/stock/978-2253004226');
  eq([res.status, res.body.errorCode, res.body.message], [409, 'OUT_OF_STOCK', 'Plus d\'exemplaire de 978-2253004226'], 'rupture de stock');
}));

test('erreur inattendue : 500 opaque, détail journalisé', () => withApp(async (http) => {
  const res = await http.get('/books/crash');
  eq(res.body, { statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Erreur interne', path: '/books/crash' }, 'corps du 500');
  check(!JSON.stringify(res.body).includes('10.0.3.7'), 'le détail interne ne doit jamais sortir');
  eq(ErrorEnvelopeFilter.logged, ['connection refused 10.0.3.7:5432'], 'erreur journalisée');
}));

test('les erreurs des middlewares passent aussi par le filtre', () => withApp(async (http) => {
  const res = await http.get('/books/ok').set('x-banned', '1');
  eq([res.status, res.body.errorCode], [401, 'UNAUTHORIZED'], 'erreur levée dans un middleware');
  eq((await http.get('/books/ok')).body, { ok: true }, 'succès inchangé');
}));

test('route inconnue : même enveloppe', () => withApp(async (http) => {
  const res = await http.get('/nope');
  eq([res.status, res.body.errorCode], [404, 'NOT_FOUND'], '404 du routeur');
}));

await run();
