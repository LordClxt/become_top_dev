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
    throw new Error('TODO: takeSnapshot');
  }

  /** Les écritures de la transaction id sont-elles visibles pour `self` avec l'instantané s ? */
  txVisible(id: number, self: number, s: Snapshot): boolean {
    throw new Error('TODO: txVisible');
  }

  /** Démarre une transaction : identifiant croissant, instantané pris tout de suite. */
  begin(level: Isolation): Tx {
    throw new Error('TODO: begin');
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
    throw new Error('TODO: vacuum');
  }

  // ---------- Jalon 3 ----------

  /** Écrit newVal si la valeur validée de la clé est oldVal, en une seule opération atomique. */
  compareAndSet(key: string, oldVal: string, newVal: string): boolean {
    throw new Error('TODO: compareAndSet');
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
    throw new Error('TODO: visibleVersion');
  }

  /** Lit une clé. En 'read-committed', l'instantané est repris à chaque lecture ; en 'snapshot', c'est celui du début. */
  get(key: string): string | undefined {
    throw new Error('TODO: get');
  }

  #write(key: string, value: string, del: boolean): void {
    throw new Error('TODO: write (put et delete s'appuient dessus)');
  }

  /** Écrit une clé. LockedError si une autre transaction non terminée l'a écrite ou verrouillée (écriture sale). */
  put(key: string, value: string): void {
    throw new Error('TODO: put');
  }

  /** Supprime une clé (mêmes erreurs que put). */
  delete(key: string): void {
    throw new Error('TODO: delete');
  }

  #finish(st: Status): void {
    throw new Error('TODO: finish (commit et abort s'appuient dessus)');
  }

  /** Valide toutes les écritures d'un coup et libère les verrous. */
  commit(): void {
    throw new Error('TODO: commit');
  }

  /** Annule toutes les écritures de la transaction et libère les verrous. */
  abort(): void {
    throw new Error('TODO: abort');
  }

  // ---------- Jalon 3 : mises à jour perdues et verrous explicites ----------

  /** Une transaction validée mais INVISIBLE dans l'instantané de t a-t-elle créé ou supprimé une version de la clé ? */
  hasConcurrentCommit(key: string): boolean {
    throw new Error('TODO: hasConcurrentCommit');
  }

  /**
   * Verrouille explicitement des clés jusqu'à la fin de la transaction (SELECT … FOR UPDATE). Tout ou rien :
   * si une clé est déjà verrouillée par une autre transaction, LockedError et aucun verrou n'est pris.
   */
  lock(...keys: string[]): void {
    throw new Error('TODO: lock');
  }
}
