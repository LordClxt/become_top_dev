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

/** Reçoit les écritures et les numérote. */
export class Leader {
  #base: number;
  #log: Entry[];
  #data: Map<string, string>;

  constructor(state?: LeaderState) {
    this.#base = state?.base ?? 0;
    this.#log = [...(state?.log ?? [])];
    this.#data = new Map(state?.data);
  }

  #append(key: string, value: string, del: boolean): number {
    const lsn = this.lastLsn() + 1;
    this.#log.push({ lsn, key, value, delete: del });
    if (del) this.#data.delete(key);
    else this.#data.set(key, value);
    return lsn;
  }

  /** Ajoute une entrée au log (premier LSN : 1), met à jour les données et renvoie le LSN attribué. */
  put(key: string, value: string): number {
    return this.#append(key, value, false);
  }

  delete(key: string): number {
    return this.#append(key, '', true);
  }

  get(key: string): string | undefined {
    return this.#data.get(key);
  }

  /** Valeur et LSN du leader au moment de la lecture. */
  getAt(key: string): { value: string | undefined; lsn: number } {
    return { value: this.#data.get(key), lsn: this.lastLsn() };
  }

  lastLsn(): number {
    return this.#base + this.#log.length;
  }

  /** Copie des entrées de LSN strictement supérieur à lsn ; lsn antérieur au début du log : LogTruncatedError. */
  since(lsn: number): Entry[] {
    if (lsn < this.#base) throw new LogTruncatedError();
    return this.#log.slice(lsn - this.#base);
  }

  // ---------- Jalon 2 ----------

  /** Copie cohérente des données et LSN auquel elle correspond. */
  snapshot(): { data: Map<string, string>; lsn: number } {
    return { data: new Map(this.#data), lsn: this.lastLsn() };
  }
}

/** Applique le log du leader, dans l'ordre, et garde son propre log. */
export class Follower {
  #base: number;
  readonly #log: Entry[] = [];
  readonly #data: Map<string, string>;

  /** Sans argument : follower vide. Avec un instantané : déjà positionné à son LSN (les données sont copiées). */
  constructor(snapshot?: { data: ReadonlyMap<string, string>; lsn: number }) {
    this.#base = snapshot?.lsn ?? 0;
    this.#data = new Map(snapshot?.data);
  }

  /** LSN de la dernière entrée appliquée. */
  appliedLsn(): number {
    return this.#base + this.#log.length;
  }

  /** Déjà vue → ignorée ; la suivante → appliquée ; plus loin → GapError, sans rien modifier. */
  apply(e: Entry): void {
    const applied = this.appliedLsn();
    if (e.lsn <= applied) return;
    if (e.lsn !== applied + 1) throw new GapError(applied + 1, e.lsn);
    this.#log.push(e);
    if (e.delete) this.#data.delete(e.key);
    else this.#data.set(e.key, e.value);
  }

  get(key: string): string | undefined {
    return this.#data.get(key);
  }

  /** Valeur et LSN appliqué au moment de la lecture. */
  getAt(key: string): { value: string | undefined; lsn: number } {
    return { value: this.#data.get(key), lsn: this.appliedLsn() };
  }

  /** Réclame au leader tout ce qui suit le dernier LSN appliqué et l'applique ; renvoie le nombre d'entrées appliquées. */
  catchUp(leader: Leader): number {
    const entries = leader.since(this.appliedLsn());
    for (const e of entries) this.apply(e);
    return entries.length;
  }

  // ---------- Jalon 2 ----------

  /** Nouveau leader issu de ce follower : il garde son log et ses données, et continue la numérotation. */
  promote(): Leader {
    return new Leader({ base: this.#base, log: this.#log, data: this.#data });
  }
}

// ---------- Jalon 2 : retard et failover ----------

/** Nombre d'écritures du leader que le follower n'a pas encore appliquées. */
export function lag(leader: Leader, f: Follower): number {
  return Math.max(0, leader.lastLsn() - f.appliedLsn());
}

/** Indice du follower le plus avancé (à égalité, le plus petit indice), ou -1 s'il n'y en a pas. */
export function mostUpToDate(fs: readonly Follower[]): number {
  let best = -1;
  fs.forEach((f, i) => { if (best === -1 || f.appliedLsn() > fs[best]!.appliedLsn()) best = i; });
  return best;
}

/** Écritures confirmées par l'ancien leader (jusqu'à oldLast) que le follower promu n'a jamais reçues. */
export function lostWrites(oldLast: number, promoted: Follower): number {
  return Math.max(0, oldLast - promoted.appliedLsn());
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

  constructor(leader: Leader, ...followers: Follower[]) {
    this.#leader = leader;
    this.#followers = followers;
  }

  /** Écrit au leader et mémorise le LSN dans la session. */
  write(s: Session, key: string, value: string): number {
    const lsn = this.#leader.put(key, value);
    s.lastWrite = Math.max(s.lastWrite, lsn);
    return lsn;
  }

  /**
   * Lit sur le premier follower assez avancé pour que la session voie ses écritures ET ne recule jamais ;
   * à défaut, lit au leader. La session retient le LSN observé.
   */
  read(s: Session, key: string): string | undefined {
    const need = Math.max(s.lastWrite, s.minSeen);
    for (const f of this.#followers) {
      const { value, lsn } = f.getAt(key);
      if (lsn < need) continue;
      s.minSeen = Math.max(s.minSeen, lsn);
      return value;
    }
    this.leaderReads++;
    const { value, lsn } = this.#leader.getAt(key);
    s.minSeen = Math.max(s.minSeen, lsn);
    return value;
  }
}
