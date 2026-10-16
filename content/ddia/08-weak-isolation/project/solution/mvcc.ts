/** Niveau d'isolation d'une transaction. */
export type Isolation = 'read-committed' | 'snapshot';

/** Clé verrouillée (ou écrite, non validée) par une autre transaction. (fournie) */
export class LockedError extends Error {
  constructor() { super('clé verrouillée par une autre transaction'); this.name = 'LockedError'; }
}
/** Une transaction concurrente a déjà validé cette clé depuis l'instantané. (fournie) */
export class ConflictError extends Error {
  constructor() { super('conflit d’écriture : une transaction concurrente a déjà validé cette clé'); this.name = 'ConflictError'; }
}
/** La transaction est terminée. (fournie) */
export class FinishedError extends Error {
  constructor() { super('transaction terminée'); this.name = 'FinishedError'; }
}

type Status = 'active' | 'committed' | 'aborted';

/**
 * Une version d'une ligne : créée par une transaction, éventuellement supprimée par une autre (deletedBy = 0 : non
 * supprimée). Une mise à jour = supprimer l'ancienne version + en créer une nouvelle. (fourni)
 */
interface Version {
  value: string;
  createdBy: number;
  deletedBy: number;
}

/** Quelles transactions sont visibles : validées, d'identifiant < next, et qui n'étaient pas en cours. (fourni) */
interface Snapshot {
  next: number;
  inProgress: ReadonlySet<number>;
}

/** Base clé-valeur multi-versions (MVCC). */
export class DB {
  #nextId = 1;
  readonly #state = new Map<number, Status>();
  readonly #rows = new Map<string, Version[]>();
  readonly #locks = new Map<string, number>(); // clé → transaction qui la détient
  readonly #txs = new Map<number, Tx>();       // transactions en cours

  // ---------- Jalon 1 : read committed, atomicité, pas d'écriture sale ----------

  /** Photographie l'état courant pour la transaction `self`. */
  takeSnapshot(self: number): Snapshot {
    const inProgress = new Set<number>();
    for (const [id, st] of this.#state) if (st === 'active' && id !== self) inProgress.add(id);
    return { next: this.#nextId, inProgress };
  }

  /** Les écritures de la transaction id sont-elles visibles pour `self` avec l'instantané s ? */
  txVisible(id: number, self: number, s: Snapshot): boolean {
    if (id === self) return true;
    return this.#state.get(id) === 'committed' && id < s.next && !s.inProgress.has(id);
  }

  /** Démarre une transaction : identifiant croissant, instantané pris tout de suite. */
  begin(level: Isolation): Tx {
    const id = this.#nextId++;
    this.#state.set(id, 'active');
    const tx = new Tx(this, id, level, this.takeSnapshot(id));
    this.#txs.set(id, tx);
    return tx;
  }

  // Accès réservés à Tx : TypeScript n'a pas de visibilité « paquet », on passe par un objet interne.
  /** @internal */
  readonly internals = {
    state: this.#state, rows: this.#rows, locks: this.#locks, txs: this.#txs,
  };

  // ---------- Jalon 2 : le nettoyage ----------

  /**
   * Supprime les versions que plus personne ne peut voir : créées par une transaction annulée, ou dont la suppression
   * est validée et visible pour toutes les transactions 'snapshot' en cours (donc pour toutes les futures).
   * Renvoie le nombre de versions supprimées.
   */
  vacuum(): number {
    let removed = 0;
    for (const [key, versions] of this.#rows) {
      const kept = versions.filter((v) => {
        let dead = this.#state.get(v.createdBy) === 'aborted';
        if (!dead && v.deletedBy !== 0 && this.#state.get(v.deletedBy) === 'committed') {
          dead = [...this.#txs.values()].every(
            (t) => t.level !== 'snapshot' || (v.deletedBy < t.snap.next && !t.snap.inProgress.has(v.deletedBy)),
          );
        }
        if (dead) removed++;
        return !dead;
      });
      this.#rows.set(key, kept);
    }
    return removed;
  }

  // ---------- Jalon 3 ----------

  /** Écrit newVal si la valeur validée de la clé est oldVal, en une seule opération atomique. */
  compareAndSet(key: string, oldVal: string, newVal: string): boolean {
    const t = this.begin('read-committed');
    try {
      if (t.get(key) !== oldVal) {
        t.abort();
        return false;
      }
      t.put(key, newVal);
      t.commit();
      return true;
    } catch {
      t.abort();
      return false;
    }
  }
}

/** Une transaction. */
export class Tx {
  readonly level: Isolation;
  readonly snap: Snapshot;
  readonly #db: DB;
  readonly #id: number;
  #done = false;

  /** @internal Créée par DB.begin. */
  constructor(db: DB, id: number, level: Isolation, snap: Snapshot) {
    this.#db = db;
    this.#id = id;
    this.level = level;
    this.snap = snap;
  }

  /** Version de la clé visible avec l'instantané s : créée par une transaction visible, non supprimée par une visible. */
  visibleVersion(key: string, s: Snapshot): Version | undefined {
    let best: Version | undefined;
    for (const v of this.#db.internals.rows.get(key) ?? []) {
      if (!this.#db.txVisible(v.createdBy, this.#id, s)) continue;
      if (v.deletedBy !== 0 && this.#db.txVisible(v.deletedBy, this.#id, s)) continue;
      best = v;
    }
    return best;
  }

  /** Lit une clé. En 'read-committed', l'instantané est repris à chaque lecture ; en 'snapshot', c'est celui du début. */
  get(key: string): string | undefined {
    if (this.#done) return undefined;
    const s = this.level === 'read-committed' ? this.#db.takeSnapshot(this.#id) : this.snap;
    return this.visibleVersion(key, s)?.value;
  }

  #write(key: string, value: string, del: boolean): void {
    if (this.#done) throw new FinishedError();
    const { state, rows, locks } = this.#db.internals;
    const owner = locks.get(key);
    if (owner !== undefined && owner !== this.#id) throw new LockedError();
    const versions = rows.get(key) ?? [];
    for (const v of versions) {
      if (v.createdBy !== this.#id && state.get(v.createdBy) === 'active') throw new LockedError(); // écriture sale interdite
      if (v.deletedBy !== 0 && v.deletedBy !== this.#id && state.get(v.deletedBy) === 'active') throw new LockedError();
    }
    if (this.level === 'snapshot' && this.hasConcurrentCommit(key)) throw new ConflictError();
    for (const v of versions) {
      const live = (state.get(v.createdBy) === 'committed' || v.createdBy === this.#id)
        && (v.deletedBy === 0 || state.get(v.deletedBy) === 'aborted');
      if (live) v.deletedBy = this.#id;
    }
    if (!del) rows.set(key, [...versions, { value, createdBy: this.#id, deletedBy: 0 }]);
  }

  /** Écrit une clé. LockedError si une autre transaction non terminée l'a écrite ou verrouillée (écriture sale). */
  put(key: string, value: string): void {
    this.#write(key, value, false);
  }

  /** Supprime une clé (mêmes erreurs que put). */
  delete(key: string): void {
    this.#write(key, '', true);
  }

  #finish(st: Status): void {
    const { state, locks, txs } = this.#db.internals;
    state.set(this.#id, st);
    txs.delete(this.#id);
    for (const [k, owner] of locks) if (owner === this.#id) locks.delete(k);
    this.#done = true;
  }

  /** Valide toutes les écritures d'un coup et libère les verrous. */
  commit(): void {
    if (this.#done) throw new FinishedError();
    this.#finish('committed');
  }

  /** Annule toutes les écritures de la transaction et libère les verrous. */
  abort(): void {
    if (!this.#done) this.#finish('aborted');
  }

  // ---------- Jalon 3 : mises à jour perdues et verrous explicites ----------

  /** Une transaction validée mais INVISIBLE dans l'instantané de t a-t-elle créé ou supprimé une version de la clé ? */
  hasConcurrentCommit(key: string): boolean {
    const { state, rows } = this.#db.internals;
    const invisibleCommit = (id: number) => state.get(id) === 'committed' && !this.#db.txVisible(id, this.#id, this.snap);
    return (rows.get(key) ?? []).some((v) => invisibleCommit(v.createdBy) || (v.deletedBy !== 0 && invisibleCommit(v.deletedBy)));
  }

  /**
   * Verrouille explicitement des clés jusqu'à la fin de la transaction (SELECT … FOR UPDATE). Tout ou rien :
   * si une clé est déjà verrouillée par une autre transaction, LockedError et aucun verrou n'est pris.
   */
  lock(...keys: string[]): void {
    if (this.#done) throw new FinishedError();
    const { locks } = this.#db.internals;
    for (const k of keys) {
      const owner = locks.get(k);
      if (owner !== undefined && owner !== this.#id) throw new LockedError();
    }
    for (const k of keys) locks.set(k, this.#id);
  }
}
