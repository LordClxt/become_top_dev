/**
 * archkit — ce qui rend le style service-based pragmatique : l'ACID dans un service à gros grain,
 * et des bibliothèques d'entités fédérées pour maîtriser la base partagée.
 */

export type Row = Record<string, unknown>;

export interface Tx {
  get(table: string, id: string): Row | undefined;
  put(table: string, id: string, row: Row): void;
  delete(table: string, id: string): void;
  /** Toutes les lignes d'une table, triées par identifiant (en tenant compte des écritures de la transaction). */
  all(table: string): [string, Row][];
  /** Valeur suivante d'une séquence (1, 2, 3…) ; annulée avec la transaction. */
  nextId(sequence: string): number;
}

export class NestedTransactionError extends Error {
  constructor() { super('transactions imbriquées non supportées'); this.name = 'NestedTransactionError'; }
}

const DELETED = Symbol('deleted');

/** Jalon 1. Base en mémoire : les écritures d'une transaction ne sont visibles qu'après le commit, et disparaissent si elle échoue. */
export class Db {
  private readonly tables = new Map<string, Map<string, Row>>();
  private readonly sequences = new Map<string, number>();
  private inTx = false;

  transaction<T>(fn: (tx: Tx) => T): T {
    if (this.inTx) throw new NestedTransactionError();
    const writes = new Map<string, Map<string, Row | typeof DELETED>>();
    const seq = new Map<string, number>();
    const pending = (table: string) => {
      let w = writes.get(table);
      if (!w) { w = new Map(); writes.set(table, w); }
      return w;
    };
    const tx: Tx = {
      get: (table, id) => {
        const w = writes.get(table)?.get(id);
        if (w === DELETED) return undefined;
        if (w !== undefined) return structuredClone(w);
        const r = this.tables.get(table)?.get(id);
        return r === undefined ? undefined : structuredClone(r);
      },
      put: (table, id, row) => { pending(table).set(id, structuredClone(row)); },
      delete: (table, id) => { pending(table).set(id, DELETED); },
      all: (table) => {
        const merged = new Map(this.tables.get(table) ?? []);
        for (const [id, w] of writes.get(table) ?? []) {
          if (w === DELETED) merged.delete(id); else merged.set(id, w);
        }
        return [...merged].sort((a, b) => a[0].localeCompare(b[0])).map(([id, r]) => [id, structuredClone(r)]);
      },
      nextId: (sequence) => {
        const next = (seq.get(sequence) ?? this.sequences.get(sequence) ?? 0) + 1;
        seq.set(sequence, next);
        return next;
      },
    };
    this.inTx = true;
    let result: T;
    try {
      result = fn(tx);
    } finally {
      this.inTx = false;
    }
    for (const [table, w] of writes) {
      let t = this.tables.get(table);
      if (!t) { t = new Map(); this.tables.set(table, t); }
      for (const [id, v] of w) {
        if (v === DELETED) t.delete(id); else t.set(id, v);
      }
    }
    for (const [s, v] of seq) this.sequences.set(s, v);
    return result;
  }

  /** Lecture hors transaction (copie). */
  get(table: string, id: string): Row | undefined {
    const r = this.tables.get(table)?.get(id);
    return r === undefined ? undefined : structuredClone(r);
  }

  /** Nombre de lignes d'une table. */
  count(table: string): number {
    return this.tables.get(table)?.size ?? 0;
  }
}

export class OutOfStockError extends Error { constructor(sku: string) { super(`stock insuffisant pour ${sku}`); this.name = 'OutOfStockError'; } }
export class PaymentDeclinedError extends Error { constructor(reason: string) { super(`paiement refusé : ${reason}`); this.name = 'PaymentDeclinedError'; } }

export interface OrderLine { sku: string; qty: number; priceCents: number }
export interface PlaceOrder { customerId: string; lines: OrderLine[]; card: string }

/** Prestataire de paiement : renvoie un identifiant de transaction ou lève PaymentDeclinedError. */
export type Charge = (card: string, amountCents: number) => string;

/** Jalon 2. Façade du service Commande : créer, numéroter, réserver le stock et payer, tout ou rien. */
export class OrderFacade {
  private readonly db: Db;
  private readonly charge: Charge;

  constructor(db: Db, charge: Charge) {
    this.db = db;
    this.charge = charge;
  }

  placeOrder(req: PlaceOrder): string {
    return this.db.transaction((tx) => {
      for (const line of req.lines) {
        const stock = tx.get('stock', line.sku);
        const available = typeof stock?.qty === 'number' ? stock.qty : 0;
        if (available < line.qty) throw new OutOfStockError(line.sku);
        tx.put('stock', line.sku, { qty: available - line.qty });
      }
      const orderId = `ORD-${tx.nextId('orders')}`;
      const total = req.lines.reduce((s, l) => s + l.qty * l.priceCents, 0);
      tx.put('orders', orderId, { customerId: req.customerId, lines: req.lines, totalCents: total, status: 'paid' });
      const paymentRef = this.charge(req.card, total);
      tx.put('payments', orderId, { ref: paymentRef, amountCents: total });
      return orderId;
    });
  }
}

export class AmbiguousTableError extends Error {
  constructor(table: string, libs: string[]) { super(`la table ${table} appartient à plusieurs bibliothèques : ${libs.join(', ')}`); this.name = 'AmbiguousTableError'; }
}
export class UnknownTableError extends Error {
  constructor(table: string) { super(`la table ${table} n'appartient à aucune bibliothèque`); this.name = 'UnknownTableError'; }
}

/**
 * Jalon 3. Services à redéployer quand des tables changent.
 * `libs` : bibliothèque d'entités → tables ; `services` : service → bibliothèques importées.
 */
export function redeployImpact(changedTables: string[], libs: Record<string, string[]>, services: Record<string, string[]>): string[] {
  const owner = new Map<string, string[]>();
  for (const [lib, tables] of Object.entries(libs)) for (const t of tables) owner.set(t, [...(owner.get(t) ?? []), lib]);
  const changedLibs = new Set<string>();
  for (const t of changedTables) {
    const o = owner.get(t);
    if (!o) throw new UnknownTableError(t);
    if (o.length > 1) throw new AmbiguousTableError(t, o.sort());
    changedLibs.add(o[0]!);
  }
  return Object.keys(services).filter((s) => services[s]!.some((l) => changedLibs.has(l))).sort();
}

/** Jalon 3. Nombre moyen de services redéployés par changement d'une table (chaque table pesant pareil). */
export function averageImpact(libs: Record<string, string[]>, services: Record<string, string[]>): number {
  const tables = Object.values(libs).flat();
  if (tables.length === 0) return 0;
  const total = tables.reduce((s, t) => s + redeployImpact([t], libs, services).length, 0);
  return Math.round((total / tables.length) * 100) / 100;
}
