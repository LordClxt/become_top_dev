import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { AppModule } from './app.module.js';
import { AUDIT } from './audit.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  AUDIT.length = 0;
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = ref.createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

const GERMINAL = { isbn: '978-2253004226', qty: 2, priceCents: 950 };
const BEL_AMI = { isbn: '978-2070413119', qty: 1, priceCents: 690 };

test('le panier survit d\'une requête à l\'autre', () => withApp(async (http) => {
  await http.post('/carts/ines').send(GERMINAL);
  await http.post('/carts/ines').send(BEL_AMI);
  eq((await http.get('/carts/ines')).body, [GERMINAL, BEL_AMI], 'panier d\'Inès après deux ajouts');
}));

test('le tableau de bord voit les vrais paniers', () => withApp(async (http) => {
  await http.post('/carts/ines').send(GERMINAL);
  await http.post('/carts/omar').send(BEL_AMI);
  eq((await http.get('/stats')).body, { grandTotalCents: 2590 }, 'total de tous les paniers');
}));

test('l\'audit garde l\'identifiant de chaque requête', () => withApp(async (http) => {
  await Promise.all(['r1', 'r2'].map((id) => http.post('/carts/ines').set('x-request-id', id).send(GERMINAL)));
  eq([...AUDIT].sort(), ['[r1] ajout 978-2253004226 pour ines', '[r2] ajout 978-2253004226 pour ines'], 'lignes d\'audit');
}));

await run();
