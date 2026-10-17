import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { AppModule } from './app.module.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('la page des nouveautés répond', () => withApp(async (http) => {
  eq((await http.get('/books/latest')).status, 200, 'GET /books/latest');
}));

test('un livre ajouté apparaît dans les nouveautés', () => withApp(async (http) => {
  await http.post('/books').send({ isbn: '978-2253004226', title: 'Germinal' });
  const res = await http.get('/books/latest');
  eq(res.body.map((b: { title: string }) => b.title), ['Germinal'], 'titres des nouveautés');
}));

await run();
