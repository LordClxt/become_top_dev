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
   * Ouvre (ou crée) une base dans dir. Les segments sont rejoués par ordre d'identifiant. Un enregistrement invalide
   * dans un segment fermé lève CorruptError ; dans le segment actif (le plus récent), c'est un enregistrement partiel
   * dû à un crash : la fin du fichier est tronquée et `dropped` donne le nombre d'octets retirés.
   */
  static open(dir: Dir, opts: Options = {}): { db: DB; dropped: number } {
    const db = new DB(dir, opts);
    const ids = [...dir.keys()].map(segId).filter((id) => id !== undefined).sort((a, b) => a - b);
    if (ids.length === 0) {
      dir.set(segName(1), new Uint8Array(0));
      return { db, dropped: 0 };
    }
    let dropped = 0;
    ids.forEach((id, n) => {
      const log = dir.get(segName(id))!;
      let off = 0;
      for (let rec; off < log.length && (rec = decode(log, off)); off += rec.size) {
        if (rec.tombstone) db.#index.delete(rec.key);
        else db.#index.set(rec.key, { seg: id, off });
      }
      if (off < log.length) {
        if (n !== ids.length - 1) throw new CorruptError(`${segName(id)} à l'offset ${off}`);
        dropped = log.length - off;
        dir.set(segName(id), log.slice(0, off));
      }
    });
    db.#active = ids.at(-1)!;
    return { db, dropped };
  }

  #append(rec: Uint8Array): number {
    const name = segName(this.#active);
    const log = this.#dir.get(name) ?? new Uint8Array(0);
    this.#dir.set(name, concat(log, rec));
    return log.length;
  }

  #rotateIfFull(): void {
    if (this.#dir.get(segName(this.#active))!.length >= this.#maxSegmentBytes) {
      this.#active++;
      this.#dir.set(segName(this.#active), new Uint8Array(0));
    }
  }

  /** Enregistre une valeur dans le segment actif ; plein, il est fermé et le segment suivant devient actif. */
  set(key: string, value: string): void {
    const off = this.#append(encode(key, value, false));
    this.#index.set(key, { seg: this.#active, off });
    this.#rotateIfFull();
  }

  /** Ajoute une pierre tombale si la clé est vivante et renvoie true ; sinon false sans rien écrire. */
  delete(key: string): boolean {
    if (!this.#index.has(key)) return false;
    this.#append(encode(key, '', true));
    this.#index.delete(key);
    this.#rotateIfFull();
    return true;
  }

  /** Valeur courante d'une clé, ou undefined. */
  get(key: string): string | undefined {
    const l = this.#index.get(key);
    return l && decode(this.#dir.get(segName(l.seg))!, l.off)?.value;
  }

  // --- Jalon 3 : état et compaction ---

  stats(): Stats {
    let segments = 0, diskBytes = 0;
    for (const [name, data] of this.#dir) {
      if (segId(name) !== undefined) { segments++; diskBytes += data.length; }
    }
    return { segments, liveKeys: this.#index.size, diskBytes };
  }

  /**
   * Fusionne les segments fermés en un seul (il en faut au moins 2, sinon renvoie 0). Seules les valeurs courantes
   * des segments fermés sont recopiées ; le segment fusionné prend l'identifiant du plus récent segment fermé.
   * Le segment actif n'est pas modifié. Renvoie le nombre de segments fermés fusionnés.
   */
  compact(): number {
    const closed = [...this.#dir.keys()].map(segId)
      .filter((id) => id !== undefined && id !== this.#active).sort((a, b) => a! - b!) as number[];
    if (closed.length < 2) return 0;
    const lives = [...this.#index].filter(([, l]) => l.seg !== this.#active)
      .sort(([, a], [, b]) => a.seg - b.seg || a.off - b.off);
    const target = closed.at(-1)!;
    const parts: Uint8Array[] = [];
    let size = 0;
    const moved = new Map<string, Loc>();
    for (const [key, l] of lives) {
      const rec = encode(key, decode(this.#dir.get(segName(l.seg))!, l.off)!.value, false);
      moved.set(key, { seg: target, off: size });
      parts.push(rec);
      size += rec.length;
    }
    for (const id of closed) this.#dir.delete(segName(id));
    if (size > 0) this.#dir.set(segName(target), concat(...parts));
    for (const [k, l] of moved) this.#index.set(k, l);
    return closed.length;
  }
}
