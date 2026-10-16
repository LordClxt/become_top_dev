import { check, eq, raises, run, test } from './spec.ts';
import { Collection, FutureVersionError, MigrationError, NotFoundError, type Doc, type Upgrader } from './collection.ts';

// Trois versions : v1 {name, city} → v2 {first_name, last_name, city} → v3 {first_name, last_name, address:{city}}.
function upgraders(): Upgrader[] {
  return [
    (d) => {
      const name = d.name;
      if (typeof name !== 'string') throw new Error('name manquant');
      const i = name.indexOf(' ');
      const { name: _, ...rest } = d;
      return { ...rest, first_name: i < 0 ? name : name.slice(0, i), last_name: i < 0 ? '' : name.slice(i + 1) };
    },
    (d) => {
      if (!('city' in d)) return d;
      const { city, ...rest } = d;
      return { ...rest, address: { city: city ?? null } };
    },
  ];
}
const newColl = () => new Collection(...upgraders());
const city = (d: Doc | undefined) => (d?.address as { city?: unknown } | undefined)?.city;

// ---------- Jalon 1 ----------

test('M1 put, raw, delete, size', () => {
  const c = newColl();
  eq(c.currentVersion, 3, 'currentVersion');
  c.put('u1', { first_name: 'Ada', last_name: 'Lovelace', address: { city: 'Londres' } });
  const raw = c.raw('u1');
  check(raw?._v === 3 && raw.first_name === 'Ada', `raw('u1') = ${JSON.stringify(raw)}, attendu un document estampillé _v = 3`);
  eq(c.size, 1, 'size après put');
  eq([c.delete('u1'), c.delete('u1'), c.size], [true, false, 0], 'delete puis delete à nouveau, puis size');
  eq(c.raw('u1'), undefined, 'raw d’un document supprimé');
});

test('M1 les copies sont profondes', () => {
  const c = newColl();
  const input: Doc = { first_name: 'Ada', address: { city: 'Londres' }, tags: ['a', 'b'] };
  c.put('u1', input);
  input.first_name = 'Modifié';
  (input.address as Doc).city = 'Paris';
  (input.tags as string[])[0] = 'z';
  check(!('_v' in input), 'put ne doit pas modifier le document de l’appelant');
  const raw = c.raw('u1')!;
  check(raw.first_name === 'Ada' && city(raw) === 'Londres' && (raw.tags as string[])[0] === 'a',
    `le stockage partage de la mémoire avec l’appelant : ${JSON.stringify(raw)}`);
  (raw.address as Doc).city = 'Rome';
  eq(city(c.raw('u1')), 'Londres', 'raw doit renvoyer une copie profonde');
});

test('M1 putRaw conserve la version', () => {
  const c = newColl();
  c.putRaw('old', { name: 'Ada Lovelace', city: 'Londres' });
  check(!('_v' in c.raw('old')!), `putRaw ne doit pas ajouter _v : ${JSON.stringify(c.raw('old'))}`);
  c.putRaw('v2', { _v: 2, first_name: 'Alan' });
  eq(c.raw('v2')?._v, 2, 'putRaw doit conserver _v');
});

// ---------- Jalon 2 ----------

test('M2 get met à niveau à la lecture', () => {
  const c = newColl();
  c.putRaw('v1', { name: 'Ada Lovelace', city: 'Londres', age: 36 });
  c.putRaw('v2', { _v: 2, first_name: 'Alan', last_name: 'Turing', city: 'Wilmslow' });
  c.put('v3', { first_name: 'Grace', last_name: 'Hopper', address: { city: 'New York' } });
  const want: Record<string, Doc> = {
    v1: { _v: 3, first_name: 'Ada', last_name: 'Lovelace', address: { city: 'Londres' }, age: 36 },
    v2: { _v: 3, first_name: 'Alan', last_name: 'Turing', address: { city: 'Wilmslow' } },
    v3: { _v: 3, first_name: 'Grace', last_name: 'Hopper', address: { city: 'New York' } },
  };
  for (const [id, w] of Object.entries(want)) eq(c.get(id), w, `get('${id}')`);
  const raw = c.raw('v1')!;
  check(raw.name === 'Ada Lovelace' && !('_v' in raw), `la mise à niveau à la lecture ne doit pas modifier le stockage : ${JSON.stringify(raw)}`);
});

test('M2 erreurs de get', async () => {
  const c = newColl();
  await raises(() => c.get('absent'), 'get d’un document absent', NotFoundError);
  c.putRaw('future', { _v: 9, x: 1 });
  await raises(() => c.get('future'), 'get d’un document de version future', FutureVersionError);
  c.putRaw('broken', { city: 'Londres' }); // v1 sans « name » : l’upgrader échoue
  const e = await raises(() => c.get('broken'), 'get quand un upgrader échoue');
  check(!(e instanceof NotFoundError), 'un upgrader en échec n’est pas un document introuvable');
  const sentinel = new Error('boom');
  const c2 = new Collection(() => { throw sentinel; });
  c2.putRaw('x', {});
  const wrapped = await raises(() => c2.get('x'), 'get quand l’upgrader lève');
  eq(wrapped.cause, sentinel, 'l’erreur de l’upgrader doit être la `cause` de l’erreur levée');
});

test('M2 get renvoie une copie indépendante', () => {
  const c = newColl();
  c.putRaw('v1', { name: 'Ada Lovelace', city: 'Londres' });
  c.get('v1').first_name = 'Modifié';
  eq(c.get('v1').first_name, 'Ada', 'modifier le résultat de get ne doit pas modifier le stockage');
});

// ---------- Jalon 3 ----------

test('M3 find à travers les versions', () => {
  const c = newColl();
  c.putRaw('a', { name: 'Ada Lovelace', city: 'Londres' });
  c.putRaw('b', { _v: 2, first_name: 'Alan', last_name: 'Turing', city: 'Londres' });
  c.put('c', { first_name: 'Grace', last_name: 'Hopper', address: { city: 'New York' } });
  c.putRaw('d', { _v: 9 });
  eq(c.find('address.city', 'Londres'), ['a', 'b'], "find('address.city', 'Londres') — les anciens documents se cherchent comme s’ils étaient à jour");
  eq(c.find('last_name', 'Hopper'), ['c'], "find('last_name', 'Hopper')");
  eq(c.find('address.zip', 'x'), [], 'find sur un chemin inexistant');
  eq(c.find('address', { city: 'New York' }), ['c'], 'find d’une valeur imbriquée (égalité profonde)');
});

test('M3 migrate réécrit le stockage', () => {
  const c = newColl();
  c.putRaw('b', { name: 'Alan Turing', city: 'Wilmslow' });
  c.putRaw('a', { name: 'Ada Lovelace', city: 'Londres' });
  c.put('c', { first_name: 'Grace' });
  eq(c.pendingMigration(), 2, 'pendingMigration avant migration');
  eq(c.migrate(), 2, 'migrate()');
  eq(c.raw('a'), { _v: 3, first_name: 'Ada', last_name: 'Lovelace', address: { city: 'Londres' } }, "raw('a') après migrate");
  eq(c.pendingMigration(), 0, 'pendingMigration après migration');
  eq(c.migrate(), 0, 'une seconde migration');
});

test('M3 migrate s’arrête au premier échec', async () => {
  const c = newColl();
  c.putRaw('a', { name: 'Ada Lovelace' });
  c.putRaw('b', { city: 'sans nom' }); // échoue
  c.putRaw('c', { name: 'Grace Hopper' });
  const e = await raises(() => c.migrate(), 'migrate avec un document illisible', MigrationError);
  eq(e.migrated, 1, 'MigrationError.migrated (documents réécrits avant l’échec)');
  check(!('_v' in c.raw('c')!), 'la migration doit s’arrêter au premier échec (ordre alphabétique des identifiants)');
  eq(c.pendingMigration(), 2, 'pendingMigration après l’échec');
});

await run();
