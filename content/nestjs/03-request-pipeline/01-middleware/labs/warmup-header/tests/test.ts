import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { AppModule } from './app.js';

test('x-shop sur /books, pas sur /health', async () => {
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    const http = request(app.getHttpServer());
    eq((await http.get('/books')).headers['x-shop'], 'librairie', 'en-tête sur /books');
    eq((await http.get('/health')).headers['x-shop'], undefined, 'pas d\'en-tête sur /health');
  } finally {
    await app.close();
  }
});

await run();
