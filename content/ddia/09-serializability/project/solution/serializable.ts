// ---------- Jalon 1 : exécution en série (procédures stockées) ----------

/** L'exécuteur est fermé. (fournie) */
export class ClosedError extends Error {
  constructor() { super('exécuteur fermé'); this.name = 'ClosedError'; }
}

/** Base en mémoire que voient les procédures. Les écritures sont annulées si la procédure échoue. */
export class Store {
  readonly #data = new Map<string, number>();
  #undo: Map<string, number | undefined> | undefined; // valeur d'origine (undefined : absente) de chaque clé écrite

  /** Valeur de la clé (0 si elle n'existe pas). */
  get(key: string): number {
    return this.#data.get(key) ?? 0;
  }

  /** Écrit la clé en retenant sa valeur d'origine pour pouvoir annuler. */
  set(key: string, value: number): void {
    if (this.#undo && !this.#undo.has(key)) this.#undo.set(key, this.#data.get(key));
    this.#data.set(key, value);
  }

  /** @internal Début d'une procédure : on se met à enregistrer les valeurs d'origine. */
  begin(): void {
    this.#undo = new Map();
  }

  /** @internal Fin d'une procédure, annulée ou non. */
  end(rollback: boolean): void {
    if (rollback) {
      for (const [k, old] of this.#undo ?? []) {
        if (old === undefined) this.#data.delete(k);
        else this.#data.set(k, old);
      }
    }
    this.#undo = undefined;
  }
}

/** Une procédure stockée : synchrone ou asynchrone, elle s'exécute seule. */
export type Procedure = (s: Store) => void | Promise<void>;

/**
 * Exécute les procédures une par une, dans l'ordre d'arrivée : même si une procédure `await` quelque chose,
 * la suivante ne démarre qu'à sa fin. Aucune entrelacement possible, donc sérialisable.
 */
export class Executor {
  readonly #store = new Store();
  #tail: Promise<unknown> = Promise.resolve();
  #closed = false;

  /**
   * Soumet une procédure et attend son résultat. Si elle lève une erreur, toutes ses écritures sont annulées et
   * l'erreur est relancée. ClosedError si l'exécuteur est fermé.
   */
  exec(proc: Procedure): Promise<void> {
    if (this.#closed) return Promise.reject(new ClosedError());
    const run = async () => {
      this.#store.begin();
      try {
        await proc(this.#store);
        this.#store.end(false);
      } catch (e) {
        this.#store.end(true);
        throw e;
      }
    };
    const result = this.#tail.then(run);
    this.#tail = result.catch(() => undefined); // une erreur ne doit pas bloquer la file
    return result;
  }

  /** Ferme l'exécuteur (idempotent). */
  close(): void {
    this.#closed = true;
  }
}

/** Hachage FNV-1a 32 bits, stable d'un processus à l'autre. (fourni) */
function fnv1a(key: string): number {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(key)) h = Math.imul(h ^ b, 0x01000193);
  return h >>> 0;
}

/** Un exécuteur par partition : en série dans une partition, en parallèle entre partitions. */
export class PartitionedExecutor {
  readonly #parts: Executor[];

  constructor(n: number) {
    this.#parts = Array.from({ length: n }, () => new Executor());
  }

  /** Partition d'une clé : hachage FNV modulo le nombre de partitions. */
  partitionOf(key: string): number {
    return fnv1a(key) % this.#parts.length;
  }

  /** Exécute une procédure dans la partition de la clé. */
  exec(key: string, proc: Procedure): Promise<void> {
    return this.#parts[this.partitionOf(key)]!.exec(proc);
  }

  close(): void {
    for (const e of this.#parts) e.close();
  }
}

// ---------- Jalon 2 : verrouillage en deux phases ----------

export type Mode = 'shared' | 'exclusive';

/** Réponse à une demande de verrou. */
export type Outcome =
  | 'granted'  // accordé
  | 'waiting'  // la transaction doit attendre
  | 'deadlock'; // accorder créerait un interblocage : la demande est refusée, la transaction doit être annulée

interface Waiter { tx: number; mode: Mode }
interface LockState { holders: Map<number, Mode>; queue: Waiter[] }

/** Verrous partagés / exclusifs de 2PL, sans bloquer : il dit si la transaction doit attendre. */
export class LockManager {
  readonly #locks = new Map<string, LockState>();

  #state(key: string): LockState {
    let ls = this.#locks.get(key);
    if (!ls) this.#locks.set(key, (ls = { holders: new Map(), queue: [] }));
    return ls;
  }

  /** tx peut-il obtenir ce mode alors que les autres détenteurs gardent leurs verrous ? */
  #compatible(ls: LockState, tx: number, mode: Mode): boolean {
    for (const [h, hm] of ls.holders) {
      if (h !== tx && (mode === 'exclusive' || hm === 'exclusive')) return false;
    }
    return true;
  }

  /**
   * Demande un verrou. Déjà détenu en mode suffisant → granted. Promotion partagé → exclusif possible si tx est seul
   * détenteur. Sinon, compatible avec les détenteurs ET personne n'attend → granted. Sinon la demande entre dans la
   * file : waiting, ou deadlock si cela crée un cycle d'attentes (alors la demande est retirée).
   */
  acquire(tx: number, key: string, mode: Mode): Outcome {
    const ls = this.#state(key);
    const current = ls.holders.get(tx);
    if (current !== undefined && (current === 'exclusive' || mode === 'shared')) return 'granted';
    const upgrading = current !== undefined;
    if (this.#compatible(ls, tx, mode) && (ls.queue.length === 0 || upgrading)) {
      ls.holders.set(tx, mode);
      return 'granted';
    }
    ls.queue.push({ tx, mode });
    if (this.#hasCycle(tx)) {
      ls.queue.pop();
      return 'deadlock';
    }
    return 'waiting';
  }

  /** Transactions qui bloquent tx : les détenteurs incompatibles avec ce qu'il attend. */
  #waitsFor(tx: number): number[] {
    const out: number[] = [];
    for (const ls of this.#locks.values()) {
      for (const w of ls.queue) {
        if (w.tx !== tx) continue;
        for (const [h, hm] of ls.holders) {
          if (h !== tx && (w.mode === 'exclusive' || hm === 'exclusive')) out.push(h);
        }
      }
    }
    return out;
  }

  /** tx peut-il s'atteindre lui-même en suivant les attentes ? */
  #hasCycle(tx: number): boolean {
    const seen = new Set<number>();
    const visit = (t: number): boolean => {
      for (const n of this.#waitsFor(t)) {
        if (n === tx) return true;
        if (!seen.has(n)) {
          seen.add(n);
          if (visit(n)) return true;
        }
      }
      return false;
    };
    return visit(tx);
  }

  /** Mode dans lequel tx détient la clé, ou undefined. */
  holds(tx: number, key: string): Mode | undefined {
    return this.#locks.get(key)?.holders.get(tx);
  }

  /**
   * Relâche tous les verrous de tx (fin de la transaction) et retire ses attentes. Accorde ensuite, clé par clé
   * (triées) et dans l'ordre de la file, les verrous qui deviennent possibles ; renvoie les transactions débloquées
   * (sans doublon, dans l'ordre d'octroi).
   */
  releaseAll(tx: number): number[] {
    const unblocked: number[] = [];
    for (const key of [...this.#locks.keys()].sort()) {
      const ls = this.#locks.get(key)!;
      ls.holders.delete(tx);
      ls.queue = ls.queue.filter((w) => w.tx !== tx);
      while (ls.queue.length > 0) {
        const w = ls.queue[0]!;
        if (!this.#compatible(ls, w.tx, w.mode)) break;
        ls.holders.set(w.tx, w.mode);
        ls.queue.shift();
        if (!unblocked.includes(w.tx)) unblocked.push(w.tx);
      }
    }
    return unblocked;
  }
}

// ---------- Jalon 3 : validation optimiste sur instantané (le cœur de SSI) ----------

/** Conflit de sérialisation : la transaction s'appuyait sur une prémisse périmée. (fournie) */
export class SerializationError extends Error {
  constructor() { super('conflit de sérialisation : la transaction s’appuyait sur une prémisse périmée'); this.name = 'SerializationError'; }
}

interface Versioned { seq: number; value: string; deleted: boolean }

/**
 * Isolation par instantané + vérification à la validation que les lectures de la transaction n'ont pas été
 * invalidées par une transaction validée depuis son début.
 */
export class OptimisticDB {
  seq = 0;
  readonly versions = new Map<string, Versioned[]>();
  readonly log: { seq: number; writes: Set<string> }[] = [];

  begin(): OTx {
    return new OTx(this);
  }
}

/** Une transaction optimiste. */
export class OTx {
  readonly #db: OptimisticDB;
  readonly #start: number;
  readonly #reads = new Set<string>();
  readonly #prefixes: string[] = []; // recherches par préfixe (prédicats)
  readonly #writes = new Map<string, { value: string; deleted: boolean }>();
  #done = false;

  /** @internal Créée par OptimisticDB.begin. */
  constructor(db: OptimisticDB) {
    this.#db = db;
    this.#start = db.seq;
  }

  /** Valeur de la clé dans l'instantané du début (version la plus récente de numéro <= début). */
  #snapshotValue(key: string): string | undefined {
    const vs = this.#db.versions.get(key) ?? [];
    for (let i = vs.length - 1; i >= 0; i--) {
      if (vs[i]!.seq <= this.#start) return vs[i]!.deleted ? undefined : vs[i]!.value;
    }
    return undefined;
  }

  /** Lit une clé : d'abord les écritures de la transaction, sinon l'instantané. La clé est mémorisée comme lue. */
  get(key: string): string | undefined {
    const w = this.#writes.get(key);
    if (w) return w.deleted ? undefined : w.value;
    this.#reads.add(key);
    return this.#snapshotValue(key);
  }

  /**
   * Couples [clé, valeur] triés par clé, de l'instantané et des écritures de la transaction, dont la clé commence par
   * prefix. Le préfixe est mémorisé comme prédicat de lecture : une insertion concurrente le rendra périmé.
   */
  scan(prefix: string): [string, string][] {
    this.#prefixes.push(prefix);
    const vals = new Map<string, string>();
    for (const k of this.#db.versions.keys()) {
      const v = k.startsWith(prefix) ? this.#snapshotValue(k) : undefined;
      if (v !== undefined) vals.set(k, v);
    }
    for (const [k, w] of this.#writes) {
      if (!k.startsWith(prefix)) continue;
      if (w.deleted) vals.delete(k);
      else vals.set(k, w.value);
    }
    return [...vals].sort(([a], [b]) => (a < b ? -1 : 1));
  }

  put(key: string, value: string): void {
    this.#writes.set(key, { value, deleted: false });
  }

  delete(key: string): void {
    this.#writes.set(key, { value: '', deleted: true });
  }

  abort(): void {
    this.#done = true;
  }

  /**
   * Valide la transaction. Sans écriture, elle réussit toujours. Sinon SerializationError si une transaction validée
   * depuis son début a écrit une clé qu'elle a lue, ou une clé qui correspond à l'un de ses préfixes de recherche.
   * Sinon ses écritures reçoivent le prochain numéro de validation.
   */
  commit(): void {
    if (this.#done) throw new SerializationError();
    this.#done = true;
    if (this.#writes.size === 0) return;
    for (const c of this.#db.log) {
      if (c.seq <= this.#start) continue;
      for (const k of c.writes) {
        if (this.#reads.has(k) || this.#prefixes.some((p) => k.startsWith(p))) throw new SerializationError();
      }
    }
    const seq = ++this.#db.seq;
    for (const [k, w] of this.#writes) {
      const vs = this.#db.versions.get(k) ?? [];
      vs.push({ seq, ...w });
      this.#db.versions.set(k, vs);
    }
    this.#db.log.push({ seq, writes: new Set(this.#writes.keys()) });
  }
}
