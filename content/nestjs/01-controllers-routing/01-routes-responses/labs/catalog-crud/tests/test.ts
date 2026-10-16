import 'reflect-metadata';
import { type CallHandler, type ExecutionContext, Injectable, Module, type NestInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { tap } from 'rxjs';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';

/** Intercepteur global : il enregistre chaque valeur renvoyée par un handler. */
@Injectable()
class SpyInterceptor implements NestInterceptor {
  static seen: unknown[] = [];
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(tap((v) => SpyInterceptor.seen.push(v)));
  }
}

@Module({
  controllers: [BooksController],
  providers: [BooksService, { provide: APP_INTERCEPTOR, useClass: SpyInterceptor }],
})
class AppModule {}

async function boot() {
  SpyInterceptor.seen = [];
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
}

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = await boot();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('GET /books et GET /books/:isbn', () => withApp(async (http) => {
  const list = await http.get('/books');
  eq(list.status, 200, 'statut de GET /books');
  eq(list.body.length, 2, 'nombre de livres');
  const one = await http.get('/books/978-2253004226');
  eq([one.status, one.body.title], [200, 'Germinal'], 'GET /books/978-2253004226 (statut, titre)');
}));

test('GET /books/:isbn inconnu → 404', () => withApp(async (http) => {
  const res = await http.get('/books/000');
  eq(res.status, 404, 'statut pour un ISBN inconnu');
  eq(res.body.statusCode, 404, 'corps d\'erreur standard de Nest (statusCode)');
}));

test('POST /books → 201 + Location, vu par l\'intercepteur', () => withApp(async (http) => {
  const res = await http.post('/books').send({ isbn: '978-2070413119', title: 'Bel-Ami' });
  eq(res.status, 201, 'statut de POST /books');
  eq(res.headers.location, '/books/978-2070413119', 'en-tête Location');
  eq(res.body, { isbn: '978-2070413119', title: 'Bel-Ami' }, 'corps de la réponse');
  check(SpyInterceptor.seen.some((v) => (v as { isbn?: string } | undefined)?.isbn === '978-2070413119'),
    'l\'intercepteur global n\'a pas vu le livre créé : la réponse doit rester standard (renvoie la valeur)');
  eq((await http.get('/books')).body.length, 3, 'le livre doit être ajouté');
}));

test('POST /books avec un ISBN existant → 409', () => withApp(async (http) => {
  const res = await http.post('/books').send({ isbn: '978-2253004226', title: 'Doublon' });
  eq(res.status, 409, 'statut pour un ISBN déjà pris');
}));

test('PUT /books/:isbn', () => withApp(async (http) => {
  const ok = await http.put('/books/978-2253004226').send({ title: 'Germinal (poche)' });
  eq([ok.status, ok.body.title], [200, 'Germinal (poche)'], 'PUT existant (statut, titre)');
  eq((await http.put('/books/000').send({ title: 'x' })).status, 404, 'PUT inconnu');
}));

test('DELETE /books/:isbn → 204 sans corps, puis 404', () => withApp(async (http) => {
  const res = await http.delete('/books/978-2070360024');
  eq(res.status, 204, 'statut de DELETE');
  eq(res.text, '', 'un 204 n\'a pas de corps');
  eq((await http.delete('/books/978-2070360024')).status, 404, 'second DELETE du même livre');
}));

await run();
