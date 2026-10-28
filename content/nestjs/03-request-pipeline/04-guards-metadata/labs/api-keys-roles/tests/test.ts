import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { AppModule } from './app.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('@Public : sans clé', () => withApp(async (http) => {
  eq((await http.get('/catalog')).status, 200, 'GET /catalog sans clé');
}));

test('clé absente ou inconnue → 401', () => withApp(async (http) => {
  eq((await http.get('/catalog/stock')).status, 401, 'sans clé');
  eq((await http.get('/catalog/stock').set('x-api-key', 'pirate')).status, 401, 'clé inconnue');
}));

test('rôles de la classe, et @CurrentUser(champ)', () => withApp(async (http) => {
  eq((await http.get('/catalog/stock').set('x-api-key', 'key-ines')).body, { by: 'Inès', stock: 12 }, 'staff');
  eq((await http.get('/catalog/stock').set('x-api-key', 'key-lea')).status, 403, 'reader refusé');
}));

test('la méthode remplace les rôles de la classe', () => withApp(async (http) => {
  eq((await http.delete('/catalog/978-2253004226').set('x-api-key', 'key-ines')).status, 403, 'staff sans admin');
  eq((await http.delete('/catalog/978-2253004226').set('x-api-key', 'key-omar')).status, 204, 'admin');
}));

test('@Auth compose, @CurrentUser() entier', () => withApp(async (http) => {
  eq((await http.get('/me').set('x-api-key', 'key-lea')).body, { id: 'u3', name: 'Léa', roles: ['reader'] }, 'reader');
  eq((await http.get('/me')).status, 401, 'sans clé');
}));

await run();
