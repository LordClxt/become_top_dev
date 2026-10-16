import { check, eq, raises, run, test } from './spec.ts';
import {
  ClosedError, Executor, LockManager, OptimisticDB, PartitionedExecutor, SerializationError, type OTx, type Store,
} from './serializable.ts';

// ---------- Jalon 1 ----------

test('M1 les procédures ne s’entrelacent jamais', async () => {
  const e = new Executor();
  // Chaque procédure lit, attend un tour de boucle d'événements, puis écrit : sans exécution en série, les mises à jour se perdraient.
  const increment = async (s: Store) => {
    const v = s.get('counter');
    await new Promise((r) => setImmediate(r));
    s.set('counter', v + 1);
  };
  await Promise.all(Array.from({ length: 200 }, () => e.exec(increment)));
  let got = 0;
  await e.exec((s) => { got = s.get('counter'); });
  eq(got, 200, 'compteur (aucune mise à jour ne doit être perdue)');
});

test('M1 une procédure en échec est annulée', async () => {
  const e = new Executor();
  await e.exec((s) => s.set('a', 10));
  const boom = new Error('boom');
  const err = await raises(() => e.exec((s) => { s.set('a', 99); s.set('b', 1); throw boom; }), 'exec d’une procédure qui échoue');
  eq(err, boom, 'exec doit relancer l’erreur de la procédure');
  let ab: number[] = [];
  await e.exec((s) => { ab = [s.get('a'), s.get('b')]; });
  eq(ab, [10, 0], 'a et b : les écritures d’une procédure en échec sont annulées');
  await e.exec(() => undefined); // une erreur ne bloque pas la file
});

test('M1 le write skew est impossible en exécution série', async () => {
  const last = new Error('dernier médecin de garde');
  const goOff = (name: string) => async (s: Store) => {
    if (s.get('alice') + s.get('bob') < 2) throw last;
    await new Promise((r) => setImmediate(r)); // le temps de « réfléchir »
    s.set(name, 0);
  };
  for (let round = 0; round < 20; round++) {
    const e = new Executor();
    await e.exec((s) => { s.set('alice', 1); s.set('bob', 1); });
    const results = await Promise.allSettled([e.exec(goOff('alice')), e.exec(goOff('bob'))]);
    let left = 0;
    await e.exec((s) => { left = s.get('alice') + s.get('bob'); });
    const refused = results.filter((r) => r.status === 'rejected').length;
    eq([left, refused], [1, 1], `tour ${round} : médecins de garde et refus`);
  }
});

test('M1 exécuteur fermé', async () => {
  const e = new Executor();
  e.close();
  await raises(() => e.exec(() => undefined), 'exec après close', ClosedError);
  e.close(); // idempotent
});

test('M1 exécuteur partitionné', async () => {
  const p = new PartitionedExecutor(4);
  for (let i = 0; i < 100; i++) {
    const k = `k${i}`;
    const a = p.partitionOf(k);
    check(a === p.partitionOf(k) && a >= 0 && a < 4, `partitionOf("${k}") instable ou hors limites : ${a}`);
  }
  const bump = (key: string) => p.exec(key, (s) => s.set(key, s.get(key) + 1));
  await Promise.all(Array.from({ length: 8 * 50 }, (_, i) => bump(`counter-${i % 10}`)));
  let total = 0;
  for (let i = 0; i < 10; i++) await p.exec(`counter-${i}`, (s) => { total += s.get(`counter-${i}`); });
  eq(total, 400, 'somme des compteurs (8 × 50)');
  const seen = new Set(Array.from({ length: 100 }, (_, i) => p.partitionOf(`counter-${i}`)));
  check(seen.size >= 3, `les clés ne se répartissent que sur ${seen.size} partitions`);
});

// ---------- Jalon 2 ----------

test('M2 les verrous partagés coexistent', () => {
  const lm = new LockManager();
  eq([lm.acquire(1, 'x', 'shared'), lm.acquire(2, 'x', 'shared')], ['granted', 'granted'], 'plusieurs lecteurs peuvent détenir un verrou partagé');
  eq(lm.holds(1, 'x'), 'shared', 'holds(1, x)');
  eq(lm.acquire(1, 'x', 'shared'), 'granted', 'redemander un verrou déjà détenu');
});

test('M2 écrivains et lecteurs s’excluent', () => {
  const a = new LockManager();
  a.acquire(1, 'x', 'exclusive');
  eq(a.acquire(2, 'x', 'shared'), 'waiting', 'un lecteur doit attendre un écrivain (contrairement à l’isolation par instantané)');
  const b = new LockManager();
  b.acquire(1, 'x', 'shared');
  eq(b.acquire(2, 'x', 'exclusive'), 'waiting', 'un écrivain doit attendre les lecteurs');
  const c = new LockManager();
  c.acquire(1, 'x', 'exclusive');
  eq(c.acquire(2, 'x', 'exclusive'), 'waiting', 'deux écrivains s’excluent');
});

test('M2 promotion quand on est seul détenteur', () => {
  const lm = new LockManager();
  lm.acquire(1, 'x', 'shared');
  eq(lm.acquire(1, 'x', 'exclusive'), 'granted', 'seul détenteur : la promotion partagé → exclusif est accordée');
  eq(lm.holds(1, 'x'), 'exclusive', 'le verrou est maintenant exclusif');
  eq(lm.acquire(1, 'x', 'shared'), 'granted', 'un verrou exclusif couvre aussi la lecture');
  const lm2 = new LockManager();
  lm2.acquire(1, 'x', 'shared');
  lm2.acquire(2, 'x', 'shared');
  eq(lm2.acquire(1, 'x', 'exclusive'), 'waiting', 'promotion impossible tant qu’un autre lecteur détient le verrou');
});

test('M2 releaseAll accorde les attentes dans l’ordre', () => {
  const lm = new LockManager();
  lm.acquire(1, 'x', 'exclusive');
  lm.acquire(2, 'x', 'shared');
  lm.acquire(3, 'x', 'shared');
  lm.acquire(4, 'x', 'exclusive');
  eq(lm.releaseAll(1), [2, 3], 'releaseAll(1) : les deux lecteurs ensemble, l’écrivain 4 attend encore');
  eq([lm.holds(1, 'x'), lm.holds(2, 'x')], [undefined, 'shared'], '1 ne détient plus rien, 2 détient un verrou partagé');
  lm.releaseAll(2);
  eq(lm.releaseAll(3), [4], 'après 2 et 3, l’écrivain 4 est débloqué');
});

test('M2 pas de famine des écrivains', () => {
  const lm = new LockManager();
  lm.acquire(1, 'x', 'shared');
  lm.acquire(2, 'x', 'exclusive'); // attend
  eq(lm.acquire(3, 'x', 'shared'), 'waiting', 'un nouveau lecteur ne doit pas doubler un écrivain déjà en attente');
});

test('M2 détecte l’interblocage', () => {
  const lm = new LockManager();
  lm.acquire(1, 'a', 'exclusive');
  lm.acquire(2, 'b', 'exclusive');
  eq(lm.acquire(1, 'b', 'exclusive'), 'waiting', '1 attend 2');
  eq(lm.acquire(2, 'a', 'exclusive'), 'deadlock', '2 attendrait 1 qui attend 2');
  eq(lm.releaseAll(2), [1], 'la demande de 2 a été retirée : en relâchant 2, 1 obtient b');
});

test('M2 cycle plus long et promotions croisées', () => {
  const lm = new LockManager();
  lm.acquire(1, 'a', 'exclusive');
  lm.acquire(2, 'b', 'exclusive');
  lm.acquire(3, 'c', 'exclusive');
  lm.acquire(1, 'b', 'shared'); // 1 attend 2
  lm.acquire(2, 'c', 'shared'); // 2 attend 3
  eq(lm.acquire(3, 'a', 'shared'), 'deadlock', 'cycle 1 → 2 → 3 → 1');
  const up = new LockManager();
  up.acquire(1, 'x', 'shared');
  up.acquire(2, 'x', 'shared');
  eq(up.acquire(1, 'x', 'exclusive'), 'waiting', '1 veut promouvoir et attend 2');
  eq(up.acquire(2, 'x', 'exclusive'), 'deadlock', 'deux promotions simultanées s’attendent mutuellement');
});

test('M2 le scénario des médecins est sérialisable sous 2PL', () => {
  const lm = new LockManager();
  for (const tx of [1, 2]) for (const k of ['alice', 'bob']) lm.acquire(tx, k, 'shared');
  eq(lm.acquire(1, 'alice', 'exclusive'), 'waiting', '1 attend que 2 relâche son verrou partagé');
  eq(lm.acquire(2, 'bob', 'exclusive'), 'deadlock', '2 attendrait 1 : interblocage, 2 est annulé — 2PL empêche le write skew');
});

// ---------- Jalon 3 ----------

function seed(db: OptimisticDB, kvs: Record<string, string>) {
  const tx = db.begin();
  for (const [k, v] of Object.entries(kvs)) tx.put(k, v);
  tx.commit();
}

test('M3 instantané et écritures propres', () => {
  const db = new OptimisticDB();
  seed(db, { a: '1' });
  const t1 = db.begin(), t2 = db.begin();
  t2.put('a', '2');
  eq(t2.get('a'), '2', 'une transaction voit ses propres écritures');
  t2.commit();
  eq(t1.get('a'), '1', 't1 garde son instantané');
  const t3 = db.begin();
  eq(t3.get('a'), '2', 'une transaction neuve voit la nouvelle valeur');
  t3.delete('a');
  eq(t3.get('a'), undefined, 'après delete, la clé n’existe plus pour la transaction');
});

test('M3 le write skew est empêché', async () => {
  const db = new OptimisticDB();
  seed(db, { alice: 'on', bob: 'on' });
  const alice = db.begin(), bob = db.begin();
  const count = (tx: OTx) => ['alice', 'bob'].filter((d) => tx.get(d) === 'on').length;
  eq([count(alice), count(bob)], [2, 2], 'chacun voit deux médecins de garde');
  alice.put('alice', 'off');
  bob.put('bob', 'off');
  alice.commit(); // la première validation réussit
  await raises(() => bob.commit(), 'bob s’appuyait sur « alice est de garde »', SerializationError);
  eq(count(db.begin()), 1, 'après l’échec de bob, il reste un médecin de garde');
});

test('M3 le fantôme est empêché', async () => {
  const db = new OptimisticDB();
  seed(db, { 'booking:room1:09': 'x' });
  const u1 = db.begin(), u2 = db.begin();
  for (const u of [u1, u2]) eq(u.scan('booking:room1:12'), [], 'aucune réservation à midi');
  u1.put('booking:room1:12', 'u1');
  u2.put('booking:room1:12-30', 'u2'); // clé différente, mais même créneau pour la recherche par préfixe
  u1.commit();
  await raises(() => u2.commit(), 'u2 avait cherché les réservations de midi (fantôme)', SerializationError);
});

test('M3 scan : instantané et écritures propres, triés', () => {
  const db = new OptimisticDB();
  seed(db, { 'p:b': 'B', 'p:a': 'A', 'q:z': 'Z' });
  const tx = db.begin();
  tx.put('p:c', 'C');
  tx.delete('p:a');
  eq(tx.scan('p:'), [['p:b', 'B'], ['p:c', 'C']], 'scan("p:") — trié, avec ses propres écritures');
});

test('M3 une lecture seule n’est jamais annulée', () => {
  const db = new OptimisticDB();
  seed(db, { a: '1' });
  const ro = db.begin();
  ro.get('a');
  ro.scan('');
  const w = db.begin();
  w.put('a', '2');
  w.put('b', '3');
  w.commit();
  ro.commit(); // ne doit pas lever
});

test('M3 des transactions disjointes valident toutes les deux', () => {
  const db = new OptimisticDB();
  seed(db, { a: '1', b: '1' });
  const t1 = db.begin(), t2 = db.begin();
  t1.get('a'); t1.put('a', '2');
  t2.get('b'); t2.put('b', '2');
  t1.commit();
  t2.commit(); // t2 n'a rien lu de ce que t1 a écrit
});

test('M3 une transaction annulée ne laisse aucune trace', async () => {
  const db = new OptimisticDB();
  const tx = db.begin();
  tx.put('ghost', 'x');
  tx.abort();
  await raises(() => tx.commit(), 'commit après abort');
  eq(db.begin().get('ghost'), undefined, 'une transaction annulée n’écrit rien');
});

await run();
