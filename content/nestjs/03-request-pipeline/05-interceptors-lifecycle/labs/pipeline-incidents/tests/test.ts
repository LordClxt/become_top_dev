import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { AppModule } from './app.js';
import { MEASURES } from './timing.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  MEASURES.length = 0;
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('ticket #601 : toutes les erreurs ont le format de l\'API', () => withApp(async (http) => {
  eq((await http.get('/books')).body, { statusCode: 401, errorCode: 'UNAUTHORIZED' }, 'sans clé');
  eq((await http.get('/books/bad').set('x-api-key', 'key-staff')).body, { statusCode: 400, errorCode: 'BAD_REQUEST' }, 'erreur du handler');
}));

test('ticket #602 : seul un admin supprime', () => withApp(async (http) => {
  eq((await http.delete('/books/978-2253004226').set('x-api-key', 'key-staff')).status, 403, 'staff');
  eq((await http.delete('/books/978-2253004226').set('x-api-key', 'key-admin')).status, 204, 'admin');
  eq((await http.get('/books').set('x-api-key', 'key-staff')).status, 200, 'staff sur la liste');
}));

test('ticket #603 : les erreurs apparaissent dans les mesures', () => withApp(async (http) => {
  await http.get('/books').set('x-api-key', 'key-staff');
  await http.get('/books/bad').set('x-api-key', 'key-staff');
  eq(MEASURES, [{ route: 'BooksController.list', outcome: 'ok' }, { route: 'BooksController.bad', outcome: 'error' }], 'mesures');
}));

await run();
