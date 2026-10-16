/** Une ligne du log de réplication. (fourni) */
export interface Entry {
  readonly lsn: number;
  readonly key: string;
  readonly value: string;
  readonly delete: boolean;
}

/** L'entrée appliquée n'est pas la suivante : il manque des entrées. (fourni) */
export class GapError extends Error {
  constructor(expected: number, got: number) { super(`trou dans le log de réplication : attendu ${expected}, reçu ${got}`); this.name = 'GapError'; }
}
/** Le log ne remonte pas assez loin : il faut repartir d'un instantané. (fourni) */
export class LogTruncatedError extends Error {
  constructor() { super('log tronqué : repartir d’un instantané'); this.name = 'LogTruncatedError'; }
}

/** État de départ d'un leader (utilisé par Follower.promote). (fourni) */
export interface LeaderState {
  base: number;          // LSN de l'instantané d'où part le log (0 = depuis le début)
  log: readonly Entry[];
  data: ReadonlyMap<string, string>;
}

// ---------- Jalon 1 : le log et le follower ----------

/** Reçoit les écritures et les numérote. Tu peux ajouter des champs. */
export class Leader {
  #base: number;
  #log: Entry[];
  #data: Map<string, string>;

  /** (fourni) */
  constructor(state?: LeaderState) {
    this.#base = state?.base ?? 0;
    this.#log = [...(state?.log ?? [])];
    this.#data = new Map(state?.data);
  }

  /** Ajoute une entrée au log (premier LSN : 1), met à jour les données et renvoie le LSN attribué. */
  put(key: string, value: string): number {
    throw new Error('TODO: put');
  }

  /** Comme put : une suppression est aussi une entrée du log. */
  delete(key: string): number {
    throw new Error('TODO: delete');
  }

  get(key: string): string | undefined {
    throw new Error('TODO: get');
  }

  /** Valeur et LSN du leader au moment de la lecture. */
  getAt(key: string): { value: string | undefined; lsn: number } {
    throw new Error('TODO: getAt');
  }

  /** LSN de la dernière entrée (base + longueur du log). */
  lastLsn(): number {
    throw new Error('TODO: lastLsn');
  }

  /** Copie des entrées de LSN strictement supérieur à lsn ; lsn antérieur au début du log : LogTruncatedError. */
  since(lsn: number): Entry[] {
    throw new Error('TODO: since');
  }

  // ---------- Jalon 2 ----------

  /** Copie cohérente des données et LSN auquel elle correspond. */
  snapshot(): { data: Map<string, string>; lsn: number } {
    throw new Error('TODO: snapshot');
  }
}

/** Applique le log du leader, dans l'ordre, et garde son propre log (comme le dit le livre). */
export class Follower {
  #base: number;
  readonly #log: Entry[] = [];
  readonly #data: Map<string, string>;

  /** Sans argument : follower vide. Avec un instantané : déjà positionné à son LSN (jalon 2 : copier les données !). */
  constructor(snapshot?: { data: ReadonlyMap<string, string>; lsn: number }) {
    this.#base = 0;          // TODO (jalon 2)
    this.#data = new Map();  // TODO (jalon 2)
  }

  /** LSN de la dernière entrée appliquée (base + longueur du log). */
  appliedLsn(): number {
    throw new Error('TODO: appliedLsn');
  }

  /** Déjà vue (LSN <= appliqué) → ignorée ; la suivante exacte → appliquée ; plus loin → GapError, sans rien modifier. */
  apply(e: Entry): void {
    throw new Error('TODO: apply');
  }

  get(key: string): string | undefined {
    throw new Error('TODO: get');
  }

  /** Valeur et LSN appliqué au moment de la lecture (en une seule opération). */
  getAt(key: string): { value: string | undefined; lsn: number } {
    throw new Error('TODO: getAt');
  }

  /** Réclame au leader tout ce qui suit le dernier LSN appliqué et l'applique ; renvoie le nombre d'entrées appliquées. */
  catchUp(leader: Leader): number {
    throw new Error('TODO: catchUp');
  }

  // ---------- Jalon 2 ----------

  /** Nouveau leader issu de ce follower : il garde son log et ses données, et continue la numérotation. */
  promote(): Leader {
    throw new Error('TODO: promote');
  }
}

// ---------- Jalon 2 : retard et failover ----------

/** Nombre d'écritures du leader que le follower n'a pas encore appliquées. */
export function lag(leader: Leader, f: Follower): number {
  throw new Error('TODO: lag');
}

/** Indice du follower le plus avancé (à égalité, le plus petit indice), ou -1 s'il n'y en a pas. */
export function mostUpToDate(fs: readonly Follower[]): number {
  throw new Error('TODO: mostUpToDate');
}

/** Écritures confirmées par l'ancien leader (jusqu'à oldLast) que le follower promu n'a jamais reçues. */
export function lostWrites(oldLast: number, promoted: Follower): number {
  throw new Error('TODO: lostWrites');
}

// ---------- Jalon 3 : un routeur qui garantit la lecture de ses écritures ----------

/** Ce qu'un utilisateur a écrit et vu. (fourni) */
export interface Session {
  lastWrite: number; // LSN de sa dernière écriture
  minSeen: number;   // LSN le plus récent déjà observé en lecture
}

/** Envoie les écritures au leader et les lectures aux followers quand c'est sûr. */
export class Router {
  /** Lectures qui ont dû aller au leader. */
  leaderReads = 0;
  readonly #leader: Leader;
  readonly #followers: readonly Follower[];

  /** (fourni) */
  constructor(leader: Leader, ...followers: Follower[]) {
    this.#leader = leader;
    this.#followers = followers;
  }

  /** Écrit au leader et mémorise le LSN dans la session. */
  write(s: Session, key: string, value: string): number {
    throw new Error('TODO: write');
  }

  /**
   * Lit sur le premier follower assez avancé pour que la session voie ses écritures ET ne recule jamais ;
   * à défaut, lit au leader (et compte la lecture dans leaderReads). La session retient le LSN observé.
   */
  read(s: Session, key: string): string | undefined {
    throw new Error('TODO: read');
  }
}
