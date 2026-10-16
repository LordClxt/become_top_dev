import { eq, raises, run, test } from './spec.ts';
import {
  Follower, GapError, Leader, LogTruncatedError, lag, lostWrites, mostUpToDate, Router, type Entry, type Session,
} from './replication.ts';

function fill(l: Leader) {
  l.put('a', '1');
  l.put('b', '2');
  l.put('a', '3');
  l.delete('b');
  l.put('c', '4');
}
const e = (lsn: number, key: string, value: string): Entry => ({ lsn, key, value, delete: false });
const session = (): Session => ({ lastWrite: 0, minSeen: 0 });

// ---------- Jalon 1 ----------

test('M1 le leader numérote ses écritures', () => {
  const l = new Leader();
  eq(l.put('a', '1'), 1, 'LSN de la première écriture');
  eq(l.put('b', '2'), 2, 'LSN de la deuxième écriture');
  eq(l.delete('a'), 3, 'LSN de la suppression (une suppression est aussi une entrée du log)');
  eq(l.lastLsn(), 3, 'lastLsn()');
  eq([l.get('a'), l.get('b')], [undefined, '2'], 'a supprimé, b = 2');
});

test('M1 since renvoie une copie', () => {
  const l = new Leader();
  fill(l);
  const es = l.since(2);
  eq(es.map((x) => x.lsn), [3, 4, 5], 'LSN de since(2)');
  es.length = 0;
  eq(l.since(2).length, 3, 'since doit renvoyer une copie : vider le résultat ne doit pas toucher le log du leader');
  eq(l.since(5), [], 'since(dernier LSN)');
});

test('M1 le follower applique dans l’ordre', () => {
  const l = new Leader();
  fill(l);
  const f = new Follower();
  for (const x of l.since(0)) f.apply(x);
  eq(f.appliedLsn(), 5, 'appliedLsn()');
  eq([f.get('a'), f.get('b')], ['3', undefined], 'a = 3 et b supprimé sur le follower aussi');
});

test('M1 un trou est refusé', async () => {
  const f = new Follower();
  await raises(() => f.apply(e(2, 'a', '1')), 'apply(LSN 2) sur un follower vide', GapError);
  eq([f.appliedLsn(), f.get('a')], [0, undefined], 'une entrée refusée ne doit rien modifier');
});

test('M1 apply est idempotent', () => {
  const f = new Follower();
  f.apply(e(1, 'x', '1'));
  f.apply(e(2, 'x', '2'));
  f.apply(e(1, 'x', '1')); // rejouer une entrée déjà vue : sans effet, pas une erreur
  eq([f.get('x'), f.appliedLsn()], ['2', 2], 'après rejeu (le rejeu ne doit pas revenir en arrière)');
});

test('M1 catchUp', () => {
  const l = new Leader();
  fill(l);
  const f = new Follower();
  const es = l.since(0);
  f.apply(es[0]!);
  f.apply(es[1]!);
  eq(f.catchUp(l), 3, 'catchUp (entrées appliquées)');
  eq([f.appliedLsn(), f.get('c')], [5, '4'], 'après catchUp');
  eq(f.catchUp(l), 0, 'un follower à jour n’a rien à rattraper');
});

// ---------- Jalon 2 ----------

test('M2 l’instantané est une copie cohérente', () => {
  const l = new Leader();
  l.put('a', '1'); l.put('b', '2'); l.put('c', '3');
  const { data, lsn } = l.snapshot();
  eq([lsn, data.size], [3, 3], 'instantané : LSN et nombre de clés');
  l.put('a', 'changed');
  l.put('d', '4');
  eq([data.get('a'), data.size], ['1', 3], 'les écritures suivantes du leader ne doivent pas apparaître dans l’instantané');
});

test('M2 nouveau follower depuis un instantané, puis rattrapage', () => {
  const l = new Leader();
  l.put('a', '1'); l.put('b', '2'); l.put('c', '3');
  const snap = l.snapshot();
  l.put('a', '9'); // pendant la copie, les clients continuent d'écrire
  l.delete('b');
  const f = new Follower(snap);
  eq(f.appliedLsn(), 3, 'un follower issu d’un instantané démarre à son LSN');
  eq(f.catchUp(l), 2, 'catchUp (LSN 4 et 5)');
  eq([f.get('a'), f.get('b'), f.get('c')], ['9', undefined, '3'], 'après rattrapage');
  snap.data.set('zzz', 'x');
  eq(f.get('zzz'), undefined, 'le follower ne doit pas partager la Map de l’instantané');
});

test('M2 retard et follower le plus avancé', () => {
  const l = new Leader();
  fill(l);
  const [f1, f2, f3] = [new Follower(), new Follower(), new Follower()];
  f1.catchUp(l);
  const es = l.since(0);
  for (const f of [f2, f3]) { f.apply(es[0]!); f.apply(es[1]!); }
  eq([lag(l, f1), lag(l, f2)], [0, 3], 'lag de f1 et f2');
  eq(mostUpToDate([f2, f1, f3]), 1, 'mostUpToDate (f1 est le plus avancé)');
  eq(mostUpToDate([f2, f3]), 0, 'à égalité, le plus petit indice');
  eq(mostUpToDate([]), -1, 'aucun follower');
});

test('M2 le failover garde la numérotation', () => {
  const old = new Leader();
  fill(old); // LSN 1..5
  const f1 = new Follower(), f2 = new Follower();
  const es = old.since(0);
  for (const x of es) f1.apply(x);
  f2.apply(es[0]!);
  f2.apply(es[1]!);
  eq(mostUpToDate([f2, f1]), 1, 'le candidat doit être f1');
  const nl = f1.promote();
  eq(nl.lastLsn(), 5, 'le nouveau leader repart du LSN 5');
  eq(nl.put('z', 'new'), 6, 'première écriture du nouveau leader (la numérotation continue)');
  eq(f2.catchUp(nl), 4, 'f2 se resynchronise sur le nouveau leader (LSN 3 à 6)');
  eq([f2.get('z'), f2.get('b')], ['new', undefined], 'f2 après resynchronisation');
});

test('M2 un failover asynchrone perd des écritures', () => {
  const old = new Leader();
  fill(old);
  const stale = new Follower();
  const es = old.since(0);
  stale.apply(es[0]!);
  stale.apply(es[1]!);
  eq(lostWrites(old.lastLsn(), stale), 3, 'lostWrites (LSN 3, 4, 5 jamais reçus)');
  eq(stale.promote().put('x', 'y'), 3, 'le nouveau leader réutilise le LSN 3 (c’est exactement ce qui fait perdre des écritures confirmées)');
  eq(lostWrites(2, stale), 0, 'rien de perdu si le follower a tout reçu');
});

test('M2 un leader issu d’un instantané ne sert pas l’histoire ancienne', async () => {
  const l = new Leader();
  l.put('a', '1'); l.put('b', '2'); l.put('c', '3');
  const nl = new Follower(l.snapshot()).promote();
  await raises(() => nl.since(1), 'since(1) sur un leader dont le log commence au LSN 3', LogTruncatedError);
  eq(nl.since(3), [], 'since(3)');
  await raises(() => new Follower().catchUp(nl), 'un follower vide ne peut pas se rattraper sur un log tronqué (il lui faut un instantané)', LogTruncatedError);
});

// ---------- Jalon 3 ----------

test('M3 write retient le LSN dans la session', () => {
  const r = new Router(new Leader(), new Follower());
  const s = session();
  eq([r.write(s, 'a', '1'), s.lastWrite], [1, 1], 'write puis session.lastWrite');
  r.write(s, 'a', '2');
  eq(s.lastWrite, 2, 'lastWrite après deux écritures');
});

test('M3 lire ses propres écritures', () => {
  const l = new Leader();
  const f = new Follower(); // jamais rattrapé : il est en retard
  const r = new Router(l, f);
  const alice = session();
  r.write(alice, 'profile', 'v2');
  eq(r.read(alice, 'profile'), 'v2', 'Alice doit voir sa propre écriture');
  eq(r.leaderReads, 1, 'le follower est en retard : la lecture devait aller au leader');
  f.catchUp(l);
  eq([r.read(alice, 'profile'), r.leaderReads], ['v2', 1], 'follower rattrapé : lecture depuis le follower');
});

test('M3 les autres peuvent lire un follower en retard', () => {
  const r = new Router(new Leader(), new Follower());
  r.write(session(), 'k', 'new');
  const bob = session();
  eq(r.read(bob, 'k'), undefined, 'Bob n’a rien écrit : il peut lire le follower en retard (et ne rien voir)');
  eq(r.leaderReads, 0, 'Bob n’a pas besoin du leader');
});

test('M3 lectures monotones', () => {
  const l = new Leader();
  const fast = new Follower(), slow = new Follower();
  l.put('c', 'hello');
  fast.catchUp(l);
  const bob = session();
  eq(new Router(l, fast, slow).read(bob, 'c'), 'hello', 'lecture sur fast');
  eq(bob.minSeen, 1, 'la session doit retenir le LSN observé');
  const second = new Router(l, slow, fast);
  eq(second.read(bob, 'c'), 'hello', 'Bob a déjà vu le commentaire : il ne doit pas le voir disparaître');
  eq(second.leaderReads, 0, 'fast est assez avancé : pas besoin du leader');
  const third = new Router(l, slow);
  eq([third.read(bob, 'c'), third.leaderReads], ['hello', 1], 'plus aucun follower assez avancé : le leader prend le relais');
});

test('M3 repli sur le leader', () => {
  const l = new Leader();
  const f = new Follower();
  l.put('a', '1');
  f.catchUp(l);
  const r = new Router(l, f);
  const s = session();
  r.write(s, 'a', '2');
  eq([r.read(s, 'a'), r.leaderReads], ['2', 1], 'lecture depuis le leader');
});

await run();
