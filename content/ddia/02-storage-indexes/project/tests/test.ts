import { check, eq, raises, run, test } from './spec.ts';
import { CorruptError, DB, HEADER_SIZE, segName, type Dir } from './engine.ts';

const k = (i: number) => `key${String(i).padStart(3, '0')}`;
function fill(db: DB, n: number) {
  for (let i = 0; i < n; i++) db.set(k(i % 20), `valeur-${i}`);
}
const small = (dir: Dir, max = 100) => DB.open(dir, { maxSegmentBytes: max }).db;

// ---------- Jalon 1 ----------

test('M1 set, get, delete et réouverture', () => {
  const dir: Dir = new Map();
  const { db, dropped } = DB.open(dir);
  eq(dropped, 0, 'dropped à la création');
  check(dir.has(segName(1)), 'open doit créer le segment 1');
  db.set('a', '1');
  db.set('b', '2');
  db.set('a', '3');
  eq([db.delete('b'), db.delete('b'), db.delete('zzz')], [true, false, false], 'delete renvoie true seulement pour une clé vivante');
  eq(db.get('a'), '3', "get('a')");
  const re = DB.open(dir);
  eq(re.dropped, 0, 'dropped à la réouverture');
  eq(re.db.get('a'), '3', "get('a') après reprise");
  eq(re.db.get('b'), undefined, 'b supprimée doit le rester après reprise (pierre tombale rejouée)');
});

test('M1 fin partielle du segment actif', () => {
  const dir: Dir = new Map();
  const { db } = DB.open(dir);
  db.set('a', 'premier');
  const good = dir.get(segName(1))!.length;
  db.set('b', 'second enregistrement');
  const full = dir.get(segName(1))!.slice();
  for (let cut = good + 1; cut < full.length; cut++) {
    const d2: Dir = new Map([[segName(1), full.slice(0, cut)]]);
    const { db: re, dropped } = DB.open(d2);
    eq([dropped, d2.get(segName(1))!.length], [cut - good, good], `coupure à ${cut} : octets retirés et taille restante`);
    eq(re.get('a'), 'premier', `coupure à ${cut} : a`);
    eq(re.get('b'), undefined, `coupure à ${cut} : b ne doit pas être lue`);
    re.set('c', 'après');
    eq(DB.open(d2).db.get('c'), 'après', `coupure à ${cut} : écriture après reprise`);
  }
});

// ---------- Jalon 2 ----------

test('M2 la rotation crée des segments', () => {
  const dir: Dir = new Map();
  const db = small(dir);
  fill(db, 60);
  const st = db.stats();
  check(st.segments >= 5, `segments = ${st.segments} : avec 100 octets maximum par segment, 60 écritures doivent en produire beaucoup`);
  eq(st.liveKeys, 20, 'liveKeys');
  for (let i = 0; i < 20; i++) eq(db.get(k(i)), `valeur-${40 + i}`, `get('${k(i)}') (la valeur la plus récente, quel que soit le segment)`);
  for (let id = 1; id < st.segments; id++) {
    check(dir.get(segName(id))!.length >= 100, `le segment fermé ${id} ne fait que ${dir.get(segName(id))!.length} octets`);
  }
});

test('M2 réouverture à travers les segments', () => {
  const dir: Dir = new Map();
  const db = small(dir);
  fill(db, 60);
  db.delete('key005');
  const re = small(dir);
  eq(re.get('key005'), undefined, 'key005 supprimée doit le rester');
  eq(re.get('key019'), 'valeur-59', "get('key019')");
  eq(re.stats().liveKeys, 19, 'liveKeys');
  re.set('nouvelle', 'x');
  eq(re.get('nouvelle'), 'x', 'écriture après réouverture');
});

test('M2 segment fermé corrompu', async () => {
  const dir: Dir = new Map();
  fill(small(dir), 40);
  dir.get(segName(1))![HEADER_SIZE + 2]! ^= 0xff;
  await raises(() => small(dir), 'open avec un segment fermé corrompu (seule la fin du segment actif peut être tronquée)', CorruptError);
});

// ---------- Jalon 3 ----------

test('M3 la compaction réduit le disque', () => {
  const db = small(new Map());
  fill(db, 200); // 20 clés réécrites 10 fois
  db.delete('key000');
  const before = db.stats();
  const merged = db.compact();
  const after = db.stats();
  check(merged >= 2, `compact a fusionné ${merged} segments`);
  eq(after.segments, 2, 'segments après compaction (le fusionné et l’actif)');
  check(after.diskBytes < before.diskBytes / 2, `la compaction doit récupérer l’espace des anciennes versions : ${before.diskBytes} → ${after.diskBytes} octets`);
  eq(after.liveKeys, before.liveKeys, 'liveKeys inchangé');
  for (let i = 1; i < 20; i++) eq(db.get(k(i)), `valeur-${180 + i}`, `get('${k(i)}') après compaction`);
  eq(db.get('key000'), undefined, 'key000 supprimée ne doit pas revenir');
});

test('M3 la compaction survit à la réouverture', () => {
  const dir: Dir = new Map();
  const db = small(dir);
  fill(db, 100);
  db.delete('key001');
  db.compact();
  db.set('key001', 'ressuscitée');
  db.set('neuve', '1');
  const re = small(dir);
  eq(re.get('key001'), 'ressuscitée', "get('key001')");
  eq(re.get('key019'), 'valeur-99', "get('key019')");
  eq(re.stats().liveKeys, 21, 'liveKeys');
});

test('M3 une pierre tombale du segment actif masque la valeur compactée', () => {
  const dir: Dir = new Map();
  const db = small(dir);
  fill(db, 60);
  db.compact();
  db.delete('key003');
  eq(small(dir).get('key003'), undefined, 'key003 doit rester supprimée à la réouverture');
});

test('M3 il faut deux segments fermés', () => {
  const dir: Dir = new Map();
  const db = DB.open(dir, { maxSegmentBytes: 1 << 20 }).db;
  db.set('a', '1');
  eq([db.compact(), dir.size], [0, 1], 'avec un seul segment (actif), compact ne fait rien');
  const s = small(new Map());
  fill(s, 60);
  s.compact();
  eq(s.compact(), 0, 'seconde compaction (il ne reste qu’un segment fermé)');
});

test('M3 tout est supprimé', () => {
  const dir: Dir = new Map();
  const db = small(dir, 60);
  for (let i = 0; i < 10; i++) db.set(`k${i}`, 'v');
  for (let i = 0; i < 10; i++) db.delete(`k${i}`);
  db.compact();
  eq(db.stats().liveKeys, 0, 'liveKeys');
  small(dir, 60); // ne doit pas lever
});

await run();
