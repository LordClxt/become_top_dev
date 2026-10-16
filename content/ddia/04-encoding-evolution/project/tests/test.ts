import { check, eq, raises, run, test } from './spec.ts';
import {
  BadKindError, BadTagError, decodeRecord, encodeRecord, KIND_STRING, KIND_VARINT, putVarint, read, readVarint,
  TruncatedError, update, type Field,
} from './codec.ts';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const S = (tag: number, str: string): Field => ({ tag, kind: KIND_STRING, str });
const I = (tag: number, int: bigint): Field => ({ tag, kind: KIND_VARINT, int });

// ---------- Jalon 1 ----------

test('M1 tailles de putVarint', () => {
  const cases: [bigint, string][] = [
    [0n, '00'], [-1n, '01'], [1n, '02'], [63n, '7e'], [-64n, '7f'], [64n, '8001'],
    [300n, 'd804'], [1337n, 'f214'], [8191n, 'fe7f'], [8192n, '808001'],
  ];
  for (const [n, want] of cases) eq(hex(putVarint(n)), want, `putVarint(${n}n) — zigzag puis groupes de 7 bits, poids faible d’abord`);
});

test('M1 aller-retour sur tout l’intervalle 64 bits', () => {
  for (const n of [0n, 1n, -1n, 63n, 64n, -64n, -65n, 1337n, -8192n, 8191n, 8192n, 1n << 31n, -(1n << 31n),
    (1n << 62n) + 7n, -(1n << 62n), 9223372036854775807n, -9223372036854775808n]) {
    const b = putVarint(n);
    eq(readVarint(Uint8Array.from([...b, 0xaa, 0xbb])), { value: n, size: b.length }, `readVarint(putVarint(${n}n)) suivi d’autres octets`);
  }
});

test('M1 erreurs de readVarint', async () => {
  await raises(() => readVarint(new Uint8Array(0)), 'entrée vide', TruncatedError);
  await raises(() => readVarint(Uint8Array.of(0x80, 0x80)), 'l’octet de poids fort annonce une suite qui manque', TruncatedError);
  const e = await raises(() => readVarint(new Uint8Array(12).fill(0xff)), 'plus de 10 octets de continuation');
  check(!(e instanceof TruncatedError), 'un entier trop long n’est pas une troncature');
});

// ---------- Jalon 2 ----------

const person = (): Field[] => [S(1, 'Martin'), I(2, 1337n), S(3, 'daydreaming'), S(3, 'hacking')];

test('M2 disposition des octets', () => {
  eq(hex(encodeRecord([I(1, 300n), S(2, 'Ada')])), '08d80412064164' + '61',
    'encodeRecord — en-tête = numéro<<3 | type ; une chaîne = longueur (varint) + octets');
});

test('M2 aller-retour avec un champ répété', () => {
  eq(decodeRecord(encodeRecord(person())), person(), 'decodeRecord(encodeRecord(x))');
});

test('M2 vide et erreurs', async () => {
  eq(decodeRecord(new Uint8Array(0)), [], 'decodeRecord sans octets');
  await raises(() => encodeRecord([I(0, 0n)]), 'numéro 0', BadTagError);
  await raises(() => encodeRecord([I(16, 0n)]), 'numéro 16', BadTagError);
  // Un type inconnu ne passe pas le vérificateur… mais des données externes ne sont pas vérifiées par tsc.
  await raises(() => encodeRecord([{ tag: 1, kind: 5 } as unknown as Field]), 'type 5', BadKindError);
  const good = encodeRecord([S(1, 'hello')]);
  await raises(() => decodeRecord(good.subarray(0, good.length - 2)), 'chaîne coupée', TruncatedError);
  await raises(() => decodeRecord(Uint8Array.of(0x0b, 0x00)), 'type 3 dans les octets', BadKindError);
  await raises(() => decodeRecord(Uint8Array.of(0x00, 0x00)), 'numéro 0 dans les octets', BadTagError);
});

// ---------- Jalon 3 ----------

const v1 = new Set([1, 2]);

test('M3 l’ancien code ignore les numéros inconnus', () => {
  const got = read(encodeRecord(person()), v1);
  eq([...got.keys()].sort(), [1, 2], 'numéros vus par l’ancien code (le 3 doit être sauté)');
  eq([got.get(1), got.get(2)], [S(1, 'Martin'), I(2, 1337n)], 'champs 1 et 2');
});

test('M3 un champ répété est vu comme son dernier élément', () => {
  eq(read(encodeRecord(person()), new Set([3])).get(3), S(3, 'hacking'), 'un code qui attend une seule valeur pour le numéro 3 voit la dernière');
});

test('M3 update conserve les champs inconnus', () => {
  const out = update(encodeRecord(person()), v1, [I(2, 42n)]);
  eq(decodeRecord(out), [S(1, 'Martin'), I(2, 42n), S(3, 'daydreaming'), S(3, 'hacking')],
    'update — les champs inconnus (numéro 3) doivent survivre, dans le même ordre');
});

test('M3 update ajoute le manquant et dédoublonne', () => {
  const b = encodeRecord([S(1, 'a'), S(1, 'b'), I(9, 7n)]);
  eq(decodeRecord(update(b, v1, [S(1, 'z'), I(2, 5n)])), [S(1, 'z'), I(9, 7n), I(2, 5n)],
    'update — remplace la 1ʳᵉ occurrence, supprime les suivantes, ajoute le manquant à la fin');
});

test('M3 update refuse un numéro hors schéma', async () => {
  await raises(() => update(encodeRecord(person()), v1, [S(3, 'x')]), 'update ne doit pas écrire un numéro inconnu du schéma de l’appelant');
});

test('M3 update ne modifie pas ses entrées', () => {
  const b = encodeRecord(person());
  const before = hex(b);
  const set = [S(1, 'Z')];
  update(b, v1, set);
  eq([hex(b), set], [before, [S(1, 'Z')]], 'update ne doit modifier ni l’enregistrement d’entrée ni set');
});

await run();
