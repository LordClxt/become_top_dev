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
 */
export function putVarint(n: bigint): Uint8Array {
  let u = BigInt.asUintN(64, (n << 1n) ^ (n >> 63n));
  const out: number[] = [];
  while (u >= 0x80n) {
    out.push(Number(u & 0x7fn) | 0x80);
    u >>= 7n;
  }
  out.push(Number(u));
  return Uint8Array.from(out);
}

/** Décode un entier au début de b : sa valeur et le nombre d'octets lus. Tronqué : TruncatedError ; > 10 octets : Error. */
export function readVarint(b: Uint8Array): { value: bigint; size: number } {
  let u = 0n;
  for (let i = 0; i < b.length; i++) {
    if (i >= 10) throw new Error('entier trop long');
    u |= BigInt(b[i]! & 0x7f) << BigInt(7 * i);
    if ((b[i]! & 0x80) === 0) return { value: (u >> 1n) ^ -(u & 1n), size: i + 1 };
  }
  throw new TruncatedError();
}

// ---------- Jalon 2 : l'enregistrement ----------

/** Concatène les champs dans l'ordre. En-tête d'un champ : un octet (numéro << 3 | type). */
export function encodeRecord(fields: readonly Field[]): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const f of fields) {
    if (!Number.isInteger(f.tag) || f.tag < 1 || f.tag > 15) throw new BadTagError(f.tag);
    switch (f.kind) {
      case KIND_VARINT:
        parts.push(Uint8Array.of((f.tag << 3) | f.kind), putVarint(f.int));
        break;
      case KIND_STRING: {
        const bytes = utf8.encode(f.str);
        parts.push(Uint8Array.of((f.tag << 3) | f.kind), putVarint(BigInt(bytes.length)), bytes);
        break;
      }
      default:
        // Les données viennent parfois d'ailleurs que du code typé : on vérifie quand même.
        throw new BadKindError((f as { kind: number }).kind);
    }
  }
  return concat(...parts);
}

/** Lit tous les champs, dans l'ordre ; un numéro répété apparaît plusieurs fois. */
export function decodeRecord(b: Uint8Array): Field[] {
  const fields: Field[] = [];
  let off = 0;
  while (off < b.length) {
    const tag = b[off]! >> 3, kind = b[off]! & 7;
    if (tag < 1 || tag > 15) throw new BadTagError(tag);
    off++;
    if (kind === KIND_VARINT) {
      const { value, size } = readVarint(b.subarray(off));
      fields.push({ tag, kind, int: value });
      off += size;
    } else if (kind === KIND_STRING) {
      const { value: len, size } = readVarint(b.subarray(off));
      if (len < 0n || BigInt(b.length - off - size) < len) throw new TruncatedError();
      const end = off + size + Number(len);
      fields.push({ tag, kind, str: fromUtf8.decode(b.subarray(off + size, end)) });
      off = end;
    } else {
      throw new BadKindError(kind);
    }
  }
  return fields;
}

// ---------- Jalon 3 : évoluer sans rien casser ----------

/**
 * Joue le rôle d'un ancien code qui ne connaît que les numéros de known : renvoie, pour chacun, le DERNIER champ
 * rencontré, et saute tout le reste.
 */
export function read(rec: Uint8Array, known: ReadonlySet<number>): Map<number, Field> {
  const out = new Map<number, Field>();
  for (const f of decodeRecord(rec)) if (known.has(f.tag)) out.set(f.tag, f);
  return out;
}

/**
 * Remplace ou ajoute les champs de set (numéros de known uniquement, sinon Error), en conservant TELS QUELS les
 * champs inconnus, dans leur ordre. Un champ de set remplace la 1ʳᵉ occurrence de son numéro, supprime les
 * suivantes, ou est ajouté à la fin. Ni rec ni set ne sont modifiés.
 */
export function update(rec: Uint8Array, known: ReadonlySet<number>, set: readonly Field[]): Uint8Array {
  for (const f of set) if (!known.has(f.tag)) throw new Error(`numéro ${f.tag} inconnu du schéma`);
  const replacements = new Map(set.map((f) => [f.tag, f]));
  const written = new Set<number>();
  const out: Field[] = [];
  for (const f of decodeRecord(rec)) {
    const repl = replacements.get(f.tag);
    if (!repl) out.push(f);
    else if (!written.has(f.tag)) { out.push(repl); written.add(f.tag); }
  }
  for (const [tag, f] of replacements) if (!written.has(tag)) out.push(f);
  return encodeRecord(out);
}
