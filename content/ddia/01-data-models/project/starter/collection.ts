import { isDeepStrictEqual } from 'node:util'; // égalité profonde, pour find

/** Valeur JSON. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
/** Document JSON de Tinybase. */
export type Doc = { [key: string]: Json };
/** Fait passer un document de la version n à la version n+1. Peut modifier et renvoyer d, ou lever une erreur. */
export type Upgrader = (d: Doc) => Doc;

/** Aucun document avec cet identifiant. */
export class NotFoundError extends Error {
  constructor(id: string) { super(`document introuvable : ${id}`); this.name = 'NotFoundError'; }
}
/** Le document a été écrit par une version plus récente que celle de la collection. */
export class FutureVersionError extends Error {
  constructor(v: number, current: number) { super(`document d'une version plus récente (${v} > ${current})`); this.name = 'FutureVersionError'; }
}
/** Migration interrompue : `migrated` documents ont été réécrits avant l'échec (dans `cause`). */
export class MigrationError extends Error {
  readonly migrated: number;
  constructor(migrated: number, id: string, cause: unknown) {
    super(`document "${id}" : ${(cause as Error).message}`, { cause });
    this.name = 'MigrationError';
    this.migrated = migrated;
  }
}

export const VERSION_KEY = '_v';

/** Copie profonde d'un document. */
export function deepCopy<T extends Json>(v: T): T {
  return structuredClone(v);
}

/** Version du schéma d'un document (1 si "_v" est absent). */
export function version(d: Doc): number {
  const v = d[VERSION_KEY];
  return typeof v === 'number' ? v : 1;
}

/** Valeur au chemin pointé ("address.city") dans d, ou undefined. */
function lookup(d: Doc, path: string): Json | undefined {
  throw new Error('TODO: lookup');
}

/** Collection de documents versionnés : le champ "_v" porte la version du schéma. */
export class Collection {
  readonly #upgraders: readonly Upgrader[];
  readonly #docs = new Map<string, Doc>();

  /** upgraders[i] fait passer un document de la version i+1 à i+2 ; la version courante vaut upgraders.length + 1. */
  constructor(...upgraders: Upgrader[]) {
    this.#upgraders = upgraders;
  }

  get currentVersion(): number {
    return this.#upgraders.length + 1;
  }

  // --- Jalon 1 ---

  /** Enregistre une copie de d, estampillée de la version courante (d n'est pas modifié). */
  put(id: string, d: Doc): void {
    throw new Error('TODO: put');
  
  }

  /** Enregistre une copie de d telle quelle (données écrites par d'anciennes versions). */
  putRaw(id: string, d: Doc): void {
    throw new Error('TODO: putRaw');
  
  }

  /** Copie du document tel qu'il est stocké, sans mise à niveau ; undefined s'il n'existe pas. */
  raw(id: string): Doc | undefined {
    throw new Error('TODO: raw');
  
  }

  /** Supprime un document ; false s'il n'existait pas. */
  delete(id: string): boolean {
    throw new Error('TODO: delete');
  
  }

  get size(): number {
    throw new Error('TODO: size');
  
  }

  // --- Jalon 2 ---

  // Conseil : écris une méthode privée #upgrade(stored: Doc): Doc partagée par get, find et migrate.

  /**
   * Copie du document à la version courante (le stockage n'est pas modifié).
   * NotFoundError s'il n'existe pas, FutureVersionError si "_v" dépasse la version courante ;
   * l'erreur d'un upgrader est relevée dans une Error dont elle est la `cause`.
   */
  get(id: string): Doc {
    throw new Error('TODO: get');
  
  }

  // --- Jalon 3 ---

  /**
   * Identifiants triés des documents dont la valeur au chemin pointé path égale value (égalité profonde),
   * après mise à niveau. Un document illisible est ignoré.
   */
  find(path: string, value: Json): string[] {
    throw new Error('TODO: find');
  
  }

  /** Nombre de documents stockés dont la version est inférieure à la version courante. */
  pendingMigration(): number {
    throw new Error('TODO: pendingMigration');
  
  }

  /**
   * Réécrit dans le stockage les documents anciens à la version courante, par identifiants triés,
   * et renvoie leur nombre. Au premier échec, s'arrête et lève une MigrationError.
   */
  migrate(): number {
    throw new Error('TODO: migrate');
  
  }
}
