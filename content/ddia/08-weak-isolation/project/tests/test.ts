import { check, eq, raises, run, test } from './spec.ts';
import { ConflictError, DB, FinishedError, LockedError, type Isolation, type Tx } from './mvcc.ts';

const get = (tx: Tx, key: string) => tx.get(key) ?? '<absent>';
const RC: Isolation = 'read-committed';
const SI: Isolation = 'snapshot';

// ---------- Jalon 1 ----------

test('M1 pas de lecture sale', () => {
  const db = new DB();
  const t1 = db.begin(RC), t2 = db.begin(RC);
  t1.put('x', '3');
  eq(get(t1, 'x'), '3', 'une transaction doit voir ses propres écritures');
  eq(get(t2, 'x'), '<absent>', 'lecture sale : t2 ne doit pas voir une écriture non validée');
  t1.commit();
  eq(get(t2, 'x'), '3', 'après la validation, read committed voit 3');
});

test('M1 l’ancienne valeur reste jusqu’à la validation', () => {
  const db = new DB();
  const s = db.begin(RC);
  s.put('x', '2');
  s.commit();
  const t1 = db.begin(RC), t2 = db.begin(RC);
  t1.put('x', '3');
  eq(get(t2, 'x'), '2', 'tant que t1 n’a pas validé, t2 lit l’ancienne valeur validée');
  t1.commit();
  eq(get(t2, 'x'), '3', 'puis la nouvelle');
});

test('M1 abort défait tout', () => {
  const db = new DB();
  const t1 = db.begin(RC);
  t1.put('email', 'bonjour');
  t1.put('unread', '1');
  t1.abort();
  const t2 = db.begin(RC);
  eq([get(t2, 'email'), get(t2, 'unread')], ['<absent>', '<absent>'], 'atomicité : après abort, aucune écriture ne subsiste');
  db.begin(RC).put('email', 'autre'); // la clé est libre
});

test('M1 pas d’écriture sale', async () => {
  const db = new DB();
  const alice = db.begin(RC), bob = db.begin(RC);
  alice.put('listing', 'Alice');
  await raises(() => bob.put('listing', 'Bob'), 'écraser une écriture non validée', LockedError);
  alice.put('invoice', 'Alice');
  alice.commit();
  bob.abort();
  const c = db.begin(RC);
  eq([get(c, 'listing'), get(c, 'invoice')], ['Alice', 'Alice'], 'la vente et la facture doivent aller à la même personne');
  db.begin(RC).put('listing', 'Bob'); // une fois Alice terminée, la clé est libre
});

test('M1 delete et transaction terminée', async () => {
  const db = new DB();
  const a = db.begin(RC);
  a.put('k', 'v');
  a.commit();
  const b = db.begin(RC), c = db.begin(RC);
  b.delete('k');
  eq(get(c, 'k'), 'v', 'la suppression n’est visible qu’après la validation');
  eq(get(b, 'k'), '<absent>', 'la transaction qui supprime ne voit plus la clé');
  b.commit();
  eq(get(c, 'k'), '<absent>', 'après validation, la clé est supprimée');
  await raises(() => b.put('x', 'y'), 'écrire après commit', FinishedError);
  await raises(() => b.commit(), 'commit deux fois', FinishedError);
});

test('M1 deux mises à jour dans la même transaction', () => {
  const db = new DB();
  const a = db.begin(RC);
  a.put('k', '1');
  a.put('k', '2');
  eq(get(a, 'k'), '2', 'la dernière écriture de la transaction doit l’emporter');
  a.commit();
  eq(get(db.begin(RC), 'k'), '2', 'après validation');
});

// ---------- Jalon 2 ----------

function seedAccounts(db: DB) {
  const s = db.begin(RC);
  s.put('a', '500');
  s.put('b', '500');
  s.commit();
}

test('M2 lecture non répétable en read committed, pas en snapshot', () => {
  for (const level of [RC, SI]) {
    const db = new DB();
    seedAccounts(db);
    const alice = db.begin(level);
    const a = get(alice, 'a');
    const transfer = db.begin(RC);
    transfer.put('a', '400');
    transfer.put('b', '600');
    transfer.commit();
    const b = get(alice, 'b');
    if (level === RC) eq([a, b], ['500', '600'], 'read committed (lecture non répétable)');
    else eq([a, b], ['500', '500'], 'snapshot (instantané cohérent)');
  }
});

test('M2 l’instantané ignore les transactions en cours à son début', () => {
  const db = new DB();
  const t1 = db.begin(RC);
  t1.put('x', '1');
  const t2 = db.begin(SI); // t1 est en cours à ce moment
  t1.commit();
  eq(get(t2, 'x'), '<absent>', 't1 était en cours au début de t2 : invisible pour t2 même après validation');
  eq(get(db.begin(SI), 'x'), '1', 'une nouvelle transaction voit x = 1');
});

test('M2 l’instantané ignore les transactions postérieures', () => {
  const db = new DB();
  const t1 = db.begin(SI);
  const t2 = db.begin(RC);
  t2.put('y', 'late');
  t2.commit();
  eq(get(t1, 'y'), '<absent>', 't2 a démarré après t1 : invisible pour t1');
});

test('M2 un lecteur long garde l’ancienne version', () => {
  const db = new DB();
  const s = db.begin(RC);
  s.put('k', 'v0');
  s.commit();
  const reader = db.begin(SI);
  for (let i = 1; i <= 5; i++) {
    const w = db.begin(RC);
    w.put('k', `v${i}`);
    w.commit();
  }
  eq(get(reader, 'k'), 'v0', 'le lecteur long garde son instantané');
  eq(get(db.begin(RC), 'k'), 'v5', 'une transaction neuve lit la dernière valeur');
});

test('M2 les écritures annulées sont invisibles', () => {
  const db = new DB();
  const a = db.begin(RC);
  a.put('k', 'ghost');
  a.abort();
  eq(get(db.begin(SI), 'k'), '<absent>', 'écriture annulée');
});

test('M2 vacuum', () => {
  const db = new DB();
  const s = db.begin(RC);
  s.put('x', 'v1');
  s.commit();
  const reader = db.begin(SI);
  const w = db.begin(RC);
  w.put('x', 'v2');
  w.commit();
  eq(db.vacuum(), 0, 'vacuum alors que le lecteur de l’instantané voit encore v1');
  eq(get(reader, 'x'), 'v1', 'le lecteur doit toujours voir v1');
  reader.commit();
  eq(db.vacuum(), 1, 'une fois le lecteur terminé, v1 est inutile');
  eq(get(db.begin(RC), 'x'), 'v2', 'v2 doit rester');
  const ab = db.begin(RC);
  ab.put('y', 'ghost');
  ab.abort();
  eq(db.vacuum(), 1, 'la version créée par une transaction annulée est à supprimer');
});

// ---------- Jalon 3 ----------

function seedCounter(db: DB) {
  const s = db.begin(RC);
  s.put('counter', '42');
  s.commit();
}

test('M3 read committed perd des mises à jour', () => {
  const db = new DB();
  seedCounter(db);
  const a = db.begin(RC), b = db.begin(RC);
  eq([get(a, 'counter'), get(b, 'counter')], ['42', '42'], 'les deux lisent 42');
  a.put('counter', '43');
  a.commit();
  b.put('counter', '43'); // read committed ne détecte rien : la mise à jour de a est perdue
  b.commit();
  eq(get(db.begin(RC), 'counter'), '43', 'read committed doit laisser perdre une mise à jour');
});

test('M3 snapshot détecte la mise à jour perdue', async () => {
  const db = new DB();
  seedCounter(db);
  const a = db.begin(SI), b = db.begin(SI);
  get(a, 'counter');
  get(b, 'counter');
  a.put('counter', '43');
  a.commit();
  await raises(() => b.put('counter', '43'), 'b écrit une clé qu’un concurrent a validée depuis son instantané', ConflictError);
  b.abort();
  const retry = db.begin(SI); // on recommence la boucle lecture-modification-écriture
  eq(get(retry, 'counter'), '43', 'la reprise voit 43');
  retry.put('counter', '44');
  retry.commit();
  eq(get(db.begin(RC), 'counter'), '44', 'aucune mise à jour perdue');
});

test('M3 conflit sur une suppression', async () => {
  const db = new DB();
  seedCounter(db);
  const a = db.begin(SI), b = db.begin(SI);
  a.delete('counter');
  a.commit();
  await raises(() => b.put('counter', '1'), 'écrire sur une clé supprimée par un concurrent validé', ConflictError);
});

const onCall = (tx: Tx) => ['alice', 'bob'].filter((d) => tx.get(d) === 'on').length;

function seedDoctors(db: DB) {
  const s = db.begin(RC);
  s.put('alice', 'on');
  s.put('bob', 'on');
  s.commit();
}

test('M3 le write skew passe à travers l’isolation par instantané', () => {
  const db = new DB();
  seedDoctors(db);
  const alice = db.begin(SI), bob = db.begin(SI);
  eq([onCall(alice), onCall(bob)], [2, 2], 'chacun voit deux médecins de garde');
  alice.put('alice', 'off'); // clés différentes : aucun conflit détecté
  bob.put('bob', 'off');
  alice.commit();
  bob.commit();
  eq(onCall(db.begin(SI)), 0, 'médecins de garde (l’isolation par instantané laisse passer ce write skew)');
});

test('M3 un verrou explicite empêche le write skew', async () => {
  const db = new DB();
  seedDoctors(db);
  const alice = db.begin(SI), bob = db.begin(SI);
  alice.lock('alice', 'bob');
  await raises(() => bob.lock('alice', 'bob'), 'lock sur des clés déjà verrouillées', LockedError);
  await raises(() => bob.put('bob', 'off'), 'écrire une clé verrouillée par une autre transaction', LockedError);
  eq(onCall(alice), 2, 'alice voit deux médecins');
  alice.put('alice', 'off');
  alice.commit();
  bob.abort();
  const retry = db.begin(SI); // bob réessaie : cette fois, il voit la vérité
  retry.lock('alice', 'bob');
  eq(onCall(retry), 1, 'au second essai, bob voit un seul médecin de garde et doit refuser de partir');
  retry.abort();
});

test('M3 les verrous sont libérés au commit et à l’abort', async () => {
  const db = new DB();
  const a = db.begin(RC), b = db.begin(RC);
  a.lock('k');
  a.abort();
  b.lock('k');
  b.commit();
  db.begin(RC).lock('k');
  await raises(() => a.lock('k'), 'lock sur une transaction terminée', FinishedError);
});

test('M3 compareAndSet', () => {
  const db = new DB();
  seedCounter(db);
  check(db.compareAndSet('counter', '42', '43'), 'la valeur validée est 42 : compareAndSet doit réussir');
  check(!db.compareAndSet('counter', '42', '44'), 'la valeur n’est plus 42 : compareAndSet doit échouer (c’est l’idée : éviter la mise à jour perdue)');
  check(!db.compareAndSet('absent', '', 'x'), 'une clé absente ne correspond à aucune valeur attendue');
  eq(get(db.begin(RC), 'counter'), '43', 'compteur');
});

await run();
