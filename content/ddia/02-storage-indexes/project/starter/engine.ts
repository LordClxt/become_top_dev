import { crc32 } from 'node:zlib';

/** Simule un répertoire : nom de fichier → contenu. C'est le « disque » de Tinybase. */
export type Dir = Map<string, Uint8Array>;

export interface Options {
  /** Taille à partir de laquelle le segment actif est fermé. Par défaut : 1 Mo. */
  maxSegmentBytes?: number;
}

/** Un segment fermé contient un enregistrement invalide. */
export class CorruptError extends Error {
  constructor(message: string) { super(`segment fermé corrompu : ${message}`); this.name = 'CorruptError'; }
}

// ---------- Fourni : format d'un enregistrement ----------
// crc32 (4) | keyLen (4) | valLen (4, −1 = pierre tombale) | clé | valeur, entiers little-endian, chaînes en UTF-8.

export const HEADER_SIZE = 12;
const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder();

export function encode(key: string, value: string, tombstone: boolean): Uint8Array {
  const k = utf8.encode(key);
  const v = tombstone ? new Uint8Array(0) : utf8.encode(value);
  const rec = new Uint8Array(HEADER_SIZE + k.length + v.length);
  const view = new DataView(rec.buffer);
  view.setUint32(4, k.length, true);
  view.setInt32(8, tombstone ? -1 : v.length, true);
  rec.set(k, HEADER_SIZE);
  rec.set(v, HEADER_SIZE + k.length);
  view.setUint32(0, crc32(rec.subarray(4)), true);
  return rec;
}

export interface Decoded { key: string; value: string; tombstone: boolean; size: number }

/** Lit l'enregistrement à l'offset off ; undefined s'il est incomplet ou si son CRC est faux. */
export function decode(log: Uint8Array, off: number): Decoded | undefined {
  if (off + HEADER_SIZE > log.length) return undefined;
  const view = new DataView(log.buffer, log.byteOffset, log.byteLength);
  const keyLen = view.getUint32(off + 4, true);
  const valLen = view.getInt32(off + 8, true);
  const tombstone = valLen < 0;
  const size = HEADER_SIZE + keyLen + (tombstone ? 0 : valLen);
  if (off + size > log.length) return undefined;
  if (crc32(log.subarray(off + 4, off + size)) !== view.getUint32(off, true)) return undefined;
  const key = fromUtf8.decode(log.subarray(off + HEADER_SIZE, off + HEADER_SIZE + keyLen));
  const value = tombstone ? '' : fromUtf8.decode(log.subarray(off + HEADER_SIZE + keyLen, off + size));
  return { key, value, tombstone, size };
}

/** Concatène des tableaux d'octets. */
export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export const segName = (id: number) => `seg-${String(id).padStart(6, '0')}.log`;

/** Identifiant d'un nom de segment, undefined si ce n'est pas un segment. */
export function segId(name: string): number | undefined {
  const m = /^seg-(\d{6})\.log$/.exec(name);
  return m ? Number(m[1]) : undefined;
}

interface Loc { seg: number; off: number }

/** État du moteur. */
export interface Stats {
  segments: number;  // nombre de fichiers segment (actif compris)
  liveKeys: number;
  diskBytes: number; // taille cumulée des segments
}

/**
 * Moteur de stockage de Tinybase : des segments de log, dont un seul est actif,
 * et un index de hachage en mémoire clé → (segment, offset).
 */
export class DB {
  readonly #dir: Dir;
  readonly #maxSegmentBytes: number;
  #active = 1;
  readonly #index = new Map<string, Loc>();

  private constructor(dir: Dir, opts: Options) {
    this.#dir = dir;
    this.#maxSegmentBytes = opts.maxSegmentBytes && opts.maxSegmentBytes > 0 ? opts.maxSegmentBytes : 1 << 20;
  }

  // --- Jalon 1 : écrire, lire, rejouer ---

  /**
   * Ouvre (ou crée) une base dans dir. Les segments ("seg-NNNNNN.log") sont rejoués par ordre d'identifiant ;
   * une pierre tombale retire la clé de l'index. Sans segment, crée le segment 1 (vide) qui devient actif.
   * Un enregistrement invalide dans un segment fermé lève CorruptError ; dans le segment actif (le plus récent),
   * c'est un enregistrement partiel dû à un crash : la fin du fichier est tronquée et `dropped` donne le nombre
   * d'octets retirés. (Une méthode statique peut lire et écrire les champs #privés de `db`.)
   */
  static open(dir: Dir, opts: Options = {}): { db: DB; dropped: number } {
    const db = new DB(dir, opts);
    throw new Error('TODO: open');
  }

  /** Enregistre une valeur dans le segment actif (jalon 2 : plein, il est fermé et le segment suivant devient actif). */
  set(key: string, value: string): void {
    throw new Error('TODO: set');
  }

  /** Ajoute une pierre tombale si la clé est vivante et renvoie true ; sinon false sans rien écrire. */
  delete(key: string): boolean {
    throw new Error('TODO: delete');
  }

  /** Valeur courante d'une clé, ou undefined. */
  get(key: string): string | undefined {
    throw new Error('TODO: get');
  }

  // --- Jalon 3 : état et compaction ---

  stats(): Stats {
    throw new Error('TODO: stats');
  }

  /**
   * Fusionne les segments fermés en un seul (il en faut au moins 2, sinon renvoie 0). Seules les valeurs courantes
   * des segments fermés sont recopiées (anciennes versions et pierres tombales disparaissent) ; le segment fusionné
   * prend l'identifiant du plus récent segment fermé. Le segment actif n'est pas modifié.
   * Renvoie le nombre de segments fermés fusionnés.
   */
  compact(): number {
    throw new Error('TODO: compact');
  }
}
