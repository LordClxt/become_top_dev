/** Types de champ (3 bits de poids faible de l'en-tête, comme dans Protocol Buffers). */
export const KIND_VARINT = 0; // entier signé 64 bits, en longueur variable (zigzag)
export const KIND_STRING = 2; // longueur (varint) puis octets UTF-8

/** Un champ : un numéro (1 à 15), un type, et la valeur qui va avec ce type (union taguée par `kind`). */
export type Field =
  | { tag: number; kind: typeof KIND_VARINT; int: bigint }
  | { tag: number; kind: typeof KIND_STRING; str: string };

export class TruncatedError extends Error {
  constructor() { super('octets tronqués'); this.name = 'TruncatedError'; }
}
export class BadKindError extends Error {
  constructor(kind: number) { super(`type de champ inconnu : ${kind}`); this.name = 'BadKindError'; }
}
export class BadTagError extends Error {
  constructor(tag: number) { super(`numéro de champ invalide (1 à 15) : ${tag}`); this.name = 'BadTagError'; }
}

const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();

/** Concatène des tableaux d'octets. (fourni) */
export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ---------- Jalon 1 : l'entier de longueur variable ----------

/**
 * Encode n en longueur variable : zigzag (les petits négatifs restent courts), puis groupes de 7 bits,
 * poids faible d'abord, le bit de poids fort de chaque octet signalant qu'un octet suit.
 * Zigzag sur 64 bits : BigInt.asUintN(64, (n << 1n) ^ (n >> 63n)).
 */
export function putVarint(n: bigint): Uint8Array {
  throw new Error('TODO: putVarint');
}

/** Décode un entier au début de b : sa valeur et le nombre d'octets lus. Tronqué : TruncatedError ; > 10 octets : Error. */
export function readVarint(b: Uint8Array): { value: bigint; size: number } {
  throw new Error('TODO: readVarint');
}

// ---------- Jalon 2 : l'enregistrement ----------

/**
 * Concatène les champs dans l'ordre. En-tête d'un champ : un octet (numéro << 3 | type).
 * Numéro hors de 1 à 15 : BadTagError. Type inconnu (données non typées) : BadKindError.
 */
export function encodeRecord(fields: readonly Field[]): Uint8Array {
  throw new Error('TODO: encodeRecord');
}

/** Lit tous les champs, dans l'ordre ; un numéro répété apparaît plusieurs fois. Octets manquants : TruncatedError. */
export function decodeRecord(b: Uint8Array): Field[] {
  throw new Error('TODO: decodeRecord');
}

// ---------- Jalon 3 : évoluer sans rien casser ----------

/**
 * Joue le rôle d'un ancien code qui ne connaît que les numéros de known : renvoie, pour chacun, le DERNIER champ
 * rencontré, et saute tout le reste.
 */
export function read(rec: Uint8Array, known: ReadonlySet<number>): Map<number, Field> {
  throw new Error('TODO: read');
}

/**
 * Remplace ou ajoute les champs de set (numéros de known uniquement, sinon Error), en conservant TELS QUELS les
 * champs inconnus, dans leur ordre. Un champ de set remplace la 1ʳᵉ occurrence de son numéro, supprime les
 * suivantes, ou est ajouté à la fin. Ni rec ni set ne sont modifiés.
 */
export function update(rec: Uint8Array, known: ReadonlySet<number>, set: readonly Field[]): Uint8Array {
  throw new Error('TODO: update');
}
