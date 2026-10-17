import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { AppModule } from './app.js';

test('GET /hello', async () => {
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    const res = await request(app.getHttpServer()).get('/hello');
    eq([res.status, res.body], [200, { message: 'Bonjour de la librairie' }], 'réponse de GET /hello');
  } finally {
    await app.close();
  }
});

await run();
