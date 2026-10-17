import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq, run, test } from './spec.js';
import { BooksController } from './books.controller.js';

@Module({ controllers: [BooksController] }) class AppModule {}

test('livre connu → 200, livre absent → 404', async () => {
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication({ logger: false });
  await app.init();
  try {
    const http = request(app.getHttpServer());
    eq((await http.get('/books/978-2253004226')).body.title, 'Germinal', 'livre connu');
    const missing = await http.get('/books/000');
    eq([missing.status, missing.body.statusCode], [404, 404], 'livre absent (statut, corps)');
  } finally {
    await app.close();
  }
});

await run();
