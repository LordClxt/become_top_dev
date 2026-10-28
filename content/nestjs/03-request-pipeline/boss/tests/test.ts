import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { AppModule } from './app.js';
import * as P from './partners.js';

const { Clock } = P;
const logged = () => ((P as unknown as { ErrorFilter?: { logged: string[] } }).ErrorFilter?.logged ?? []);

class FakeClock extends Clock {
  t = 0;
  override now() { return this.t; }
}

async function withApp(body: (http: ReturnType<typeof request>, clock: FakeClock) => Promise<void>) {
  const clock = new FakeClock();
  const ref = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(Clock).useValue(clock).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()), clock);
  } finally {
    await app.close();
  }
}

const FNAC = { authorization: 'Bearer pk_fnac' };
const BLOG = { authorization: 'Bearer pk_blog' };

test('succès : enveloppe et identifiant de requête', () => withApp(async (http) => {
  const res = await http.get('/partner/books').set(FNAC).set('x-request-id', 'r-1');
  eq([res.status, res.body], [200, { data: ['Germinal', 'Bel-Ami'], meta: { requestId: 'r-1' } }], 'réponse');
  eq(res.headers['x-request-id'], 'r-1', 'en-tête renvoyé');
  eq((await http.get('/partner/ping').set(FNAC)).text, 'pong', '@RawResponse : pas d\'enveloppe');
}));

test('authentification : 401 INVALID_KEY', () => withApp(async (http) => {
  for (const h of [{}, { authorization: 'Bearer pk_pirate' }, { authorization: 'pk_fnac' }]) {
    const res = await http.get('/partner/books').set(h as Record<string, string>).set('x-request-id', 'r-2');
    eq([res.status, res.body.errorCode, res.body.requestId], [401, 'INVALID_KEY', 'r-2'], `en-têtes ${JSON.stringify(h)}`);
  }
}));

test('portées : classe ET méthode cumulées', () => withApp(async (http) => {
  eq((await http.get('/partner/stock/978-2253004226').set(FNAC)).body.data, { isbn: '978-2253004226', stock: 4, for: 'fnac' }, 'fnac a stock:read');
  const res = await http.get('/partner/stock/978-2253004226').set(BLOG);
  eq([res.status, res.body.errorCode], [403, 'MISSING_SCOPE'], 'blog sans stock:read');
  check(String(res.body.message).includes('stock:read'), `le message doit nommer la portée manquante : ${res.body.message}`);
}));

test('quota par partenaire et par minute', () => withApp(async (http, clock) => {
  clock.t = 10_000;
  for (let i = 0; i < 2; i++) eq((await http.get('/partner/books').set(BLOG)).status, 200, `appel ${i + 1}`);
  const over = await http.get('/partner/books').set(BLOG);
  eq([over.status, over.body.errorCode, over.headers['retry-after']], [429, 'QUOTA_EXCEEDED', '60'], 'troisième appel');
  eq((await http.get('/partner/books').set(FNAC)).status, 200, 'l\'autre partenaire n\'est pas affecté');
  clock.t = 70_000;
  eq((await http.get('/partner/books').set(BLOG)).status, 200, 'nouvelle minute');
}));

test('un 403 ne consomme pas de quota', () => withApp(async (http) => {
  for (let i = 0; i < 3; i++) await http.get('/partner/stock/x').set(BLOG);
  eq((await http.get('/partner/books').set(BLOG)).status, 200, 'appel autorisé après trois refus');
}));

test('erreur inattendue : 500 opaque', () => withApp(async (http) => {
  const res = await http.get('/partner/crash').set(FNAC).set('x-request-id', 'r-9');
  eq(res.body, { statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Erreur interne', requestId: 'r-9' }, 'corps');
  check(logged().some((m) => m.includes('ECONNREFUSED')), 'le détail doit être journalisé (ErrorFilter.logged)');
}));

test('route inconnue : même format', () => withApp(async (http) => {
  const res = await http.get('/nope').set('x-request-id', 'r-0');
  eq([res.status, res.body.errorCode, res.body.requestId], [404, 'NOT_FOUND', 'r-0'], '404 du routeur');
}));

await run();
