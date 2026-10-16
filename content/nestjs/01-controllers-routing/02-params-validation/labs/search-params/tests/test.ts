import 'reflect-metadata';
import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';

@Module({ controllers: [BooksController], providers: [BooksService] })
class AppModule {}

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

test('GET /books : valeurs par défaut page=1, limit=10', () => withApp(async (http) => {
  const res = await http.get('/books');
  eq(res.status, 200, 'statut');
  eq([res.body.page, res.body.limit, res.body.total, res.body.items.length], [1, 10, 30, 10], '[page, limit, total, items.length]');
  check(typeof res.body.page === 'number', 'page doit être un nombre, pas une chaîne');
}));

test('GET /books?page=3&limit=7 : la bonne tranche', () => withApp(async (http) => {
  const res = await http.get('/books?page=3&limit=7');
  eq(res.body.items.map((b: { id: number }) => b.id), [15, 16, 17, 18, 19, 20, 21], 'ids de la page 3');
  eq([res.body.page, res.body.limit], [3, 7], '[page, limit] (nombres)');
}));

test('GET /books?author=hugo : filtre insensible à la casse', () => withApp(async (http) => {
  const res = await http.get('/books?author=hugo&limit=50');
  eq(res.body.total, 10, 'nombre de livres de Victor Hugo');
  check(res.body.items.every((b: { author: string }) => b.author === 'Victor Hugo'), 'seuls les livres de Hugo');
}));

test('GET /books : paramètres invalides → 400', () => withApp(async (http) => {
  for (const q of ['page=abc', 'page=0', 'limit=0', 'limit=51', 'limit=2.5']) {
    eq((await http.get(`/books?${q}`)).status, 400, `GET /books?${q}`);
  }
}));

test('GET /books/:id : 400 si non entier, 404 si absent', () => withApp(async (http) => {
  eq((await http.get('/books/abc')).status, 400, 'GET /books/abc');
  eq((await http.get('/books/999')).status, 404, 'GET /books/999');
  eq((await http.get('/books/5')).body.title, 'Livre 5', 'GET /books/5');
}));

test('POST /books : corps validé, champs inconnus retirés', () => withApp(async (http) => {
  const res = await http.post('/books').send({ title: 'Nana', author: 'Émile Zola', year: 1880, admin: true });
  eq(res.status, 201, 'statut de création');
  eq(res.body, { id: 31, title: 'Nana', author: 'Émile Zola', year: 1880 }, 'livre créé (sans le champ admin)');
}));

test('POST /books : corps invalides → 400', () => withApp(async (http) => {
  const bad = [
    { author: 'Zola', year: 1880 },
    { title: '', author: 'Zola', year: 1880 },
    { title: 'Nana', author: 'Zola', year: '1880' },
    { title: 'Nana', author: 'Zola', year: 1880.5 },
    { title: 'Nana', author: 'Zola', year: 1200 },
  ];
  for (const body of bad) eq((await http.post('/books').send(body)).status, 400, `POST ${JSON.stringify(body)}`);
  eq((await http.get('/books')).body.total, 30, 'aucun livre invalide ne doit être ajouté');
}));

await run();
