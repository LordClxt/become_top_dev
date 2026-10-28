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

/** Jalon 1. Base en mémoire : les écritures d'une transaction ne sont visibles qu'après le commit, et disparaissent si elle échoue. */
export class Db {
  // TODO : l'état dont tu as besoin (tables, séquences, transaction en cours…)

  transaction<T>(fn: (tx: Tx) => T): T {
    throw new Error('TODO: transaction');
  }

  /** Lecture hors transaction (copie). */
  get(table: string, id: string): Row | undefined {
    throw new Error('TODO: get');
  }

  /** Nombre de lignes d'une table. */
  count(table: string): number {
    throw new Error('TODO: count');
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
    throw new Error('TODO: placeOrder');
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
  throw new Error('TODO: redeployImpact');
}

/** Jalon 3. Nombre moyen de services redéployés par changement d'une table (chaque table pesant pareil). */
export function averageImpact(libs: Record<string, string[]>, services: Record<string, string[]>): number {
  throw new Error('TODO: averageImpact');
}
