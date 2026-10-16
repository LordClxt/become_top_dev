import 'reflect-metadata';
import { check, eq, raises, run, test } from './spec.js';
import { Container, INJECTABLE, ResolutionError } from './injector.js';
import { Broken, BooksRepository, BooksService, Clock, NeedsInterface, NeedsUndecorated, Undecorated } from './fixtures.js';

test('@Injectable() pose le marqueur', () => {
  eq(Reflect.getMetadata(INJECTABLE, Clock), true, 'métadonnée INJECTABLE sur Clock');
  eq(Reflect.getMetadata(INJECTABLE, Undecorated), undefined, 'métadonnée INJECTABLE sur une classe non décorée');
});

test('resolve construit tout le graphe', () => {
  const c = new Container();
  const service = c.resolve(BooksService);
  check(service instanceof BooksService, 'resolve(BooksService) doit renvoyer un BooksService');
  check(service.repo instanceof BooksRepository, 'la dépendance repo doit être un BooksRepository');
  eq(service.titles(), ['Germinal', 'Nana'], 'service.titles()');
});

test('singletons : une seule instance par classe', () => {
  const c = new Container();
  const service = c.resolve(BooksService);
  check(c.resolve(BooksService) === service, 'deux resolve(BooksService) doivent renvoyer la même instance');
  check(service.clock === service.repo.clock, 'Clock doit être partagé entre BooksService et BooksRepository');
  check(c.resolve(Clock) === service.clock, 'resolve(Clock) doit renvoyer l\'instance déjà créée');
});

test('register remplace une dépendance', () => {
  const c = new Container();
  const fake = { now: () => 7 } as Clock;
  c.register(Clock, fake);
  eq(c.resolve(BooksService).clock.now(), 7, 'clock.now() avec la fausse horloge');
});

test('classe non décorée : erreur explicite', async () => {
  const c = new Container();
  const e = await raises(() => c.resolve(NeedsUndecorated), 'resolve(NeedsUndecorated)', ResolutionError);
  check(e.message.includes('Undecorated'), `le message doit nommer la classe Undecorated, obtenu « ${e.message} »`);
});

test('interface en paramètre : erreur qui parle d\'Object', async () => {
  const c = new Container();
  const e = await raises(() => c.resolve(NeedsInterface), 'resolve(NeedsInterface)', ResolutionError);
  check(e.message.includes('Object'), `le message doit mentionner Object, obtenu « ${e.message} »`);
  check(e.message.includes('[1]'), `le message doit donner l'index [1], obtenu « ${e.message} »`);
});

test('paramètre undefined (import circulaire) : erreur avec l\'index', async () => {
  const c = new Container();
  const e = await raises(() => c.resolve(Broken), 'resolve(Broken)', ResolutionError);
  check(e.message.includes('Broken') && e.message.includes('[1]'),
    `le message doit nommer Broken et l'index [1], obtenu « ${e.message} »`);
});

await run();
