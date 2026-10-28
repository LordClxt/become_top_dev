import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { AppModule, CatalogService } from './app.js';
import { Clock, Metrics } from './support.js';

class FakeClock extends Clock {
  t = 1_000;
  override now() { return this.t; }
}

async function withApp(body: (http: ReturnType<typeof request>, s: { clock: FakeClock; catalog: CatalogService; metrics: Metrics }) => Promise<void>) {
  const clock = new FakeClock();
  const ref = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(Clock).useValue(clock).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()), { clock, catalog: ref.get(CatalogService), metrics: ref.get(Metrics) });
  } finally {
    await app.close();
  }
}

test('le cache court-circuite le handler, puis expire', () => withApp(async (http, { clock, catalog }) => {
  eq((await http.get('/catalog/bestsellers')).body, ['Germinal', 'Bel-Ami'], 'première réponse');
  await http.get('/catalog/bestsellers');
  eq(catalog.calls, 1, 'appels au service après deux GET (le second vient du cache)');
  clock.t += 60_001;
  await http.get('/catalog/bestsellers');
  eq(catalog.calls, 2, 'appels après expiration');
}));

test('pas de cache sans @CacheTtl', () => withApp(async (http, { catalog }) => {
  await http.get('/catalog/fresh');
  await http.get('/catalog/fresh');
  eq(catalog.calls, 2, 'appels sur une route non cachée');
}));

test('la mesure couvre les succès et les erreurs', () => withApp(async (http, { metrics }) => {
  const ok = await http.get('/catalog/fresh');
  check(ok.headers['x-response-time-ms'] !== undefined, 'en-tête x-response-time-ms sur un succès');
  eq((await http.get('/catalog/fail/boom')).status, 400, 'l\'erreur reste une 400');
  eq(metrics.measures.map((m) => [m.route, m.outcome]),
    [['CatalogController.fresh', 'ok'], ['CatalogController.fail', 'error']], 'mesures enregistrées');
}));

await run();
