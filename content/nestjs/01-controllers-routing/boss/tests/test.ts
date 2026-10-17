import 'reflect-metadata';
import request from 'supertest';
import { check, eq, run, test } from './spec.js';
import { createApp } from './app.js';

async function withApp(body: (http: ReturnType<typeof request>) => Promise<void>) {
  const app = await createApp();
  await app.init();
  try {
    await body(request(app.getHttpServer()));
  } finally {
    await app.close();
  }
}

const URL1 = '/api/v1/books/978-2253004226/reviews';
const URL2 = '/api/v2/books/978-2253004226/reviews';
const R = (author: string, rating: number) => ({ author, rating, text: `Un avis de ${author}, assez long.` });

test('créer, lire, supprimer un avis (v1)', () => withApp(async (http) => {
  const created = await http.post(URL1).send(R('ines', 5));
  eq(created.status, 201, 'statut de création');
  eq(created.headers.location, `${URL1}/${created.body.id}`, 'en-tête Location');
  eq((await http.get(URL1)).body.length, 1, 'liste après création');
  const del = await http.delete(`${URL1}/${created.body.id}`);
  eq([del.status, del.text], [204, ''], 'suppression');
  eq((await http.delete(`${URL1}/${created.body.id}`)).status, 404, 'seconde suppression');
  eq((await http.delete(`${URL1}/abc`)).status, 400, 'identifiant non numérique');
}));

test('erreurs du contrat', () => withApp(async (http) => {
  eq((await http.get('/api/v1/books/978-0000000000/reviews')).status, 404, 'livre inconnu');
  eq((await http.post(URL1).send({ author: 'x', rating: 9, text: 'court' })).status, 400, 'corps invalide');
  await http.post(URL1).send(R('omar', 4));
  eq((await http.post(URL1).send(R('omar', 2))).status, 409, 'deuxième avis du même auteur');
}));

test('résumé : une route littérale sous une route paramétrée', () => withApp(async (http) => {
  eq((await http.get(`${URL1}/summary`)).body, { count: 0, average: null }, 'résumé vide');
  await http.post(URL1).send(R('a', 5));
  await http.post(URL1).send(R('b', 4));
  await http.post(URL1).send(R('c', 4));
  eq((await http.get(`${URL1}/summary`)).body, { count: 3, average: 4.3 }, 'résumé (moyenne à un décimale)');
}));

test('v2 : filtre et pagination bornée, v1 inchangée', () => withApp(async (http) => {
  for (const [i, n] of [5, 3, 4, 1, 5].entries()) await http.post(URL1).send(R(`u${i}`, n));
  const res = await http.get(`${URL2}?minRating=4&limit=2&offset=1`);
  eq([res.body.total, res.body.items.length, res.body.limit, res.body.offset], [3, 2, 2, 1], 'enveloppe v2');
  check(res.body.items.every((r: { rating: number }) => r.rating >= 4), 'filtre minRating');
  eq((await http.get(`${URL2}?limit=100`)).status, 400, 'limit trop grand');
  eq((await http.get(`${URL2}?minRating=0`)).status, 400, 'minRating hors bornes');
  check(Array.isArray((await http.get(URL1)).body), 'v1 renvoie toujours un tableau');
}));

test('sonde et préfixe', () => withApp(async (http) => {
  eq((await http.get('/health')).status, 200, '/health hors préfixe et hors version');
  eq((await http.get('/api/books/978-2253004226/reviews')).status, 404, 'pas de route sans version');
}));

await run();
