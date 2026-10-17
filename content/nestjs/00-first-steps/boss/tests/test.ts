import 'reflect-metadata';
import { check, eq, raises, run, test } from './spec.js';
import { Container, Inject, Injectable, ResolutionError } from './container.js';

const CONFIG = Symbol('CONFIG');
const LOG: string[] = [];

@Injectable() class Clock { now() { return 42; } onInit() { LOG.push('Clock'); } }
abstract class Mailer { abstract send(to: string): string; }
@Injectable() class FakeMailer extends Mailer { send(to: string) { return `fake:${to}`; } }
@Injectable() class Shop {
  constructor(readonly clock: Clock, @Inject(CONFIG) readonly config: { name: string }, readonly mailer: Mailer) {}
  onInit() { LOG.push('Shop'); }
}
@Injectable() class Orders {
  constructor(readonly shop: Shop, readonly clock: Clock) {}
  async onInit() { await new Promise((r) => setTimeout(r, 5)); LOG.push('Orders'); }
}

function shopContainer() {
  const c = new Container();
  c.provide(CONFIG, { useValue: { name: 'La Page Tournée' } });
  c.provide(Mailer, { useClass: FakeMailer });
  return c;
}

test('résolution récursive, @Inject et classe abstraite', () => {
  const shop = shopContainer().get<Shop>(Shop);
  eq([shop.clock.now(), shop.config.name, shop.mailer.send('a@b.fr')], [42, 'La Page Tournée', 'fake:a@b.fr'], 'dépendances de Shop');
});

test('singletons par jeton', () => {
  const c = shopContainer();
  const orders = c.get<Orders>(Orders);
  check(orders.shop === c.get(Shop) && orders.clock === orders.shop.clock, 'une seule instance par jeton');
  check(c.get(Mailer) === orders.shop.mailer, 'useClass : la même instance à chaque get');
});

test('erreurs lisibles', async () => {
  const missing = await raises(() => new Container().get(Shop), 'CONFIG absent', ResolutionError);
  check(/CONFIG/.test(missing.message) && /Shop/.test(missing.message), `le message doit citer CONFIG et Shop : ${missing.message}`);
  class Plain {}
  await raises(() => new Container().get(Plain), 'classe non injectable', ResolutionError);
  interface Repo { find(): void }
  @Injectable() class UsesInterface { constructor(readonly repo: Repo) {} }
  const obj = await raises(() => new Container().get(UsesInterface), 'interface comme type', ResolutionError);
  check(/\[0\]/.test(obj.message), `le message doit donner l'index [0] : ${obj.message}`);
});

test('dépendance circulaire détectée avec son chemin', async () => {
  @Injectable() class A { constructor(@Inject('B') readonly b: unknown) {} }
  @Injectable() class B { constructor(@Inject('A') readonly a: unknown) {} }
  const c = new Container();
  c.provide('A', { useClass: A });
  c.provide('B', { useClass: B });
  const err = await raises(() => c.get('A'), 'cycle A ↔ B', ResolutionError);
  check(err.message.includes('A -> B -> A'), `le message doit montrer le chemin « A -> B -> A » : ${err.message}`);
});

test('init() : hooks des dépendances avant leurs consommateurs, une fois chacun', async () => {
  LOG.length = 0;
  const c = shopContainer();
  c.get(Orders);
  await c.init();
  eq(LOG, ['Clock', 'Shop', 'Orders'], 'ordre des onInit');
});

await run();
