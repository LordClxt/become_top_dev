import { check, eq, raises, run, test } from './spec.ts';
import {
  AlreadyStartedError, Broker, idempotent, Mediator, NotInFlightError, NotStoppedError, UnknownChannelError,
  type MediatorState, type Message, type StateStore,
} from './eda.ts';

// ---------- Jalon 1 ----------

test('M1 topics : une copie par abonné, et personne n’écoute = le message disparaît', () => {
  const b = new Broker();
  const pay = b.subscribe('order-created', 'payment');
  const inv = b.subscribe('order-created', 'inventory');
  eq([pay, inv], ['order-created/payment', 'order-created/inventory'], 'noms des abonnements');
  const id = b.publish('order-created', { order: 'o-1' });
  b.publish('email-sent', { to: 'ana' });
  eq([b.depth(pay), b.depth(inv)], [1, 1], 'chaque abonné a sa copie');
  const m1 = b.receive(pay, 'payment-1')!;
  const m2 = b.receive(inv, 'inventory-1')!;
  eq([m1.id, m2.id, m1.body], [id, id, { order: 'o-1' }], 'même message pour les deux abonnés');
  const late = b.subscribe('order-created', 'warehouse');
  eq(b.depth(late), 0, 'un abonné tardif ne reçoit pas les publications passées');
});

test('M1 files : consommateurs concurrents', () => {
  const b = new Broker();
  b.declareQueue('bids');
  for (let i = 1; i <= 4; i++) b.send('bids', i);
  const got = [b.receive<number>('bids', 'c1')!.body, b.receive<number>('bids', 'c2')!.body, b.receive<number>('bids', 'c1')!.body, b.receive<number>('bids', 'c2')!.body];
  eq(got, [1, 2, 3, 4], 'chaque message va à un seul consommateur, dans l’ordre');
  eq([b.depth('bids'), b.receive('bids', 'c1')], [0, undefined], 'file vide');
});

test('M1 acquittement client et redistribution', async () => {
  const b = new Broker();
  b.declareQueue('q');
  b.send('q', 'a'); b.send('q', 'b'); b.send('q', 'c');
  const a = b.receive<string>('q', 'p1')!;
  const bb = b.receive<string>('q', 'p1')!;
  b.ack('p1', 'q', a.id);
  eq(b.depth('q'), 1, 'c est encore prêt, b est réservé');
  eq(b.crash('p1'), 1, 'un message non acquitté revient');
  const again = b.receive<string>('q', 'p2')!;
  eq([again.body, again.redelivered, again.id], ['b', true, bb.id], 'b est redistribué en premier, marqué redelivered');
  eq(b.receive<string>('q', 'p2')!.redelivered, false, 'c n’a jamais été redistribué');
  await raises(() => b.ack('p1', 'q', bb.id), 'p1 n’a plus ce message', NotInFlightError);
  await raises(() => b.receive('ghost', 'p1'), 'canal inconnu', UnknownChannelError);
});

test('M1 un plantage rend les messages dans leur ordre de lecture', () => {
  const b = new Broker();
  b.declareQueue('q');
  ['a', 'b', 'c', 'd'].forEach((x) => b.send('q', x));
  b.receive('q', 'p'); b.receive('q', 'p'); b.receive('q', 'p');
  b.crash('p');
  const order = [1, 2, 3, 4].map(() => b.receive<string>('q', 'x')!.body);
  eq(order, ['a', 'b', 'c', 'd'], 'ordre après redistribution');
});

test('M1 les messages sont des copies', () => {
  const b = new Broker();
  b.declareQueue('q');
  const body = { n: 1 };
  b.send('q', body);
  body.n = 99;
  eq(b.receive<{ n: number }>('q', 'c')!.body, { n: 1 }, 'modifier l’objet envoyé ne modifie pas le message');
});

// ---------- Jalon 2 ----------

test('M2 request-reply avec identifiant de corrélation', () => {
  const b = new Broker();
  b.declareQueue('orders'); b.declareQueue('replies');
  const r1 = b.request('orders', { book: 'FSA' });
  const r2 = b.request('orders', { book: 'DDIA' });
  const first = b.receive<{ book: string }>('orders', 'placement')!;
  const second = b.receive<{ book: string }>('orders', 'placement')!;
  b.reply('replies', second, { orderId: 'ORD-2' });
  b.reply('replies', first, { orderId: 'ORD-1' });
  eq(b.takeReply<{ orderId: string }>('replies', r1)?.body, { orderId: 'ORD-1' }, 'la réponse de la requête 1, même arrivée en second');
  eq(b.depth('replies'), 1, 'l’autre réponse reste dans la file');
  eq(b.takeReply('replies', 'inconnu'), undefined, 'aucune réponse pour une corrélation inconnue');
  eq(b.takeReply<{ orderId: string }>('replies', r2)?.correlationId, r2, 'la réponse porte la corrélation');
});

test('M2 consommateur idempotent face à la redistribution', () => {
  const b = new Broker();
  b.declareQueue('payments');
  b.send('payments', { amount: 50 });
  const charged: number[] = [];
  const consumer = idempotent<{ amount: number }>((m) => charged.push(m.body.amount));
  const m = b.receive<{ amount: number }>('payments', 'p1')!;
  consumer.handle(m);           // le débit est fait…
  b.crash('p1');                // …mais le consommateur plante avant l'ack
  const again = b.receive<{ amount: number }>('payments', 'p2')!;
  eq([consumer.handle(again), charged, consumer.processed()], [false, [50], 1], '[retraité ?, débits, messages traités]');
});

test('M2 un gestionnaire qui échoue ne marque pas le message comme traité', async () => {
  let fail = true;
  const consumer = idempotent<number>(() => { if (fail) throw new Error('base indisponible'); });
  const msg: Message<number> = { id: 'm1', body: 1, redelivered: false };
  await raises(() => consumer.handle(msg), 'premier essai', Error);
  fail = false;
  eq(consumer.handle({ ...msg, redelivered: true }), true, 'le second essai est bien traité');
});

// ---------- Jalon 3 ----------

class MemoryStore implements StateStore {
  data = new Map<string, MediatorState>();
  get(id: string) { const s = this.data.get(id); return s && structuredClone(s); }
  put(id: string, s: MediatorState) { this.data.set(id, structuredClone(s)); }
  delete(id: string) { this.data.delete(id); }
}
const steps = [['create'], ['email', 'payment', 'inventory'], ['fulfill', 'order-stock'], ['email', 'ship'], ['email']];

function setup(failPayment: () => boolean) {
  const calls: string[] = [];
  const task = (name: string) => async (id: string) => {
    if (name === 'payment' && failPayment()) throw new Error('carte expirée');
    calls.push(`${name}(${id})`);
  };
  const tasks = Object.fromEntries(['create', 'email', 'payment', 'inventory', 'fulfill', 'order-stock', 'ship'].map((n) => [n, task(n)]));
  const store = new MemoryStore();
  return { calls, store, mediator: new Mediator(steps, tasks, store) };
}

test('M3 un workflow complet efface son état', async () => {
  const { calls, store, mediator } = setup(() => false);
  const s = await mediator.start('o-1');
  eq(s.status, 'completed', 'statut');
  eq(calls.length, 9, 'tâches exécutées (1 + 3 + 2 + 2 + 1)');
  eq(calls.filter((c) => c.startsWith('email')).length, 3, 'trois e-mails, un par étape concernée');
  eq(store.get('o-1'), undefined, 'l’état est supprimé à la fin');
});

test('M3 arrêt sur erreur, état persisté', async () => {
  const { calls, store, mediator } = setup(() => true);
  const s = await mediator.start('o-2');
  eq([s.status, s.step, s.error], ['stopped', 1, 'payment: carte expirée'], '[statut, étape, erreur]');
  eq([...s.done].sort(), ['0:create', '1:email', '1:inventory'], 'tâches acquittées');
  eq(store.get('o-2')?.status, 'stopped', 'état persisté');
  check(!calls.some((c) => c.startsWith('fulfill')), 'la préparation ne doit pas commencer tant que le paiement n’est pas acquitté');
});

test('M3 reprise à l’étape en échec, sans refaire ce qui est fait', async () => {
  let expired = true;
  const { calls, store, mediator } = setup(() => expired);
  await mediator.start('o-3');
  const before = calls.length;
  expired = false;
  const s = await mediator.resume('o-3');
  eq(s.status, 'completed', 'statut après reprise');
  eq(calls.slice(before)[0], 'payment(o-3)', 'la reprise commence par la tâche en échec');
  eq(calls.filter((c) => c === 'create(o-3)').length, 1, 'la commande n’est pas recréée');
  eq(calls.filter((c) => c === 'inventory(o-3)').length, 1, 'le stock n’est pas ajusté deux fois');
  eq(calls.filter((c) => c === 'email(o-3)').length, 3, 'aucun e-mail en double');
  eq(store.get('o-3'), undefined, 'état supprimé');
});

test('M3 démarrages et reprises invalides', async () => {
  const { mediator } = setup(() => true);
  await mediator.start('o-4');
  await raises(() => mediator.start('o-4'), 'démarrer deux fois', AlreadyStartedError);
  await raises(() => mediator.resume('o-5'), 'reprendre un workflow inconnu', NotStoppedError);
  const s = await mediator.resume('o-4');
  eq(s.status, 'stopped', 'toujours en échec : de nouveau arrêté');
});

await run();
