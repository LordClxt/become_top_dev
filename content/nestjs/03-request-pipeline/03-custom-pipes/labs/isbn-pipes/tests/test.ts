import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { BooksModule } from './books.js';
import { ParseIsbnPipe } from './pipes.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = (await Test.createTestingModule({ imports: [BooksModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('ParseIsbnPipe normalise', () => {
  const pipe = new ParseIsbnPipe();
  eq(['9782253004226', '978-2253004226', '978 2 253 00422 6'].map((v) => pipe.transform(v)),
    ['978-2253004226', '978-2253004226', '978-2253004226'], 'trois écritures du même ISBN');
});

test('ParseIsbnPipe refuse les ISBN faux', () => withApp(async (http) => {
  for (const bad of ['9782253004227', '123', '977-2253004226', 'abc']) {
    const res = await http.get(`/books/${encodeURIComponent(bad)}/normalized`);
    eq([res.status, res.body.errorCode], [400, 'INVALID_ISBN'], `ISBN « ${bad} »`);
  }
}));

test('BookByIsbnPipe : du paramètre au livre', () => withApp(async (http) => {
  eq((await http.get('/books/9782253004226')).body, { isbn: '978-2253004226', title: 'Germinal' }, 'livre trouvé sans tiret');
  eq((await http.get('/books/978-2253096344')).status, 404, 'ISBN valide mais livre absent');
}));

await run();
