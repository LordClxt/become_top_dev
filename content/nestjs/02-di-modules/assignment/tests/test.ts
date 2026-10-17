import 'reflect-metadata';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { AppModule } from './app.module.js';

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

test('l\'application démarre', () => withApp(async (http) => {
  eq((await http.get('/orders/ord_1')).body, { id: 'ord_1', amountCents: 1290, status: 'pending' }, 'commande ord_1');
  eq((await http.get('/orders/ord_9')).status, 404, 'commande inconnue');
}));

test('payer puis rembourser', () => withApp(async (http) => {
  eq((await http.post('/orders/ord_1/pay')).body.status, 'paid', 'statut après paiement');
  eq((await http.get('/payments')).body, [{ orderId: 'ord_1', amountCents: 1290, refunded: false }], 'paiements enregistrés');
  const refund = await http.post('/payments/ord_1/refund');
  eq([refund.status, refund.body.refunded], [201, true], 'remboursement');
  eq((await http.get('/orders/ord_1')).body.status, 'refunded', 'la commande est marquée remboursée');
  eq((await http.post('/payments/ord_1/refund')).status, 422, 'second remboursement');
  eq((await http.post('/payments/ord_2/refund')).status, 422, 'remboursement d\'une commande non payée');
}));

test('le cycle est supprimé, pas contourné', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const sources = readdirSync(dir).filter((f) => f.endsWith('.js') && !['test.js', 'spec.js'].includes(f));
  for (const file of sources) {
    const code = readFileSync(`${dir}/${file}`, 'utf8');
    check(!/forwardRef|ModuleRef/.test(code), `${file} utilise forwardRef ou ModuleRef : supprime le cycle au lieu de le contourner`);
  }
});

await run();
