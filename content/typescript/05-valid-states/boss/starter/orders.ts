export interface Line {
  sku: string;
  qty: number;
  unitCents: number;
}
export type Carrier = 'colissimo' | 'ups';
export type PaymentMethod = 'card' | 'transfer';

// TODO 1 : remplace cette interface pleine d'optionnels par une union d'interfaces taguées par status :
// DraftOrder | PlacedOrder | PaidOrder | ShippedOrder | DeliveredOrder | CancelledOrder.
export interface Order {
  id: number;
  status: 'draft' | 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  lines: readonly Line[];
  placedAt?: Date;
  paymentMethod?: PaymentMethod;
  amountCents?: number;
  carrier?: Carrier;
  tracking?: string;
  deliveredAt?: Date;
  cancelReason?: string;
  refundCents?: number;
}
export type DraftOrder = Order;
export type PlacedOrder = Order;
export type PaidOrder = Order;
export type ShippedOrder = Order;
export type DeliveredOrder = Order;
export type CancelledOrder = Order;

export function draft(id: number): DraftOrder {
  return { id, status: 'draft', lines: [] };
}

export function totalCents(lines: readonly Line[]): number {
  return lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0);
}

// TODO 2 : les transitions, chacune limitée à son état de départ.
export function addLine(order: DraftOrder, line: Line): DraftOrder {
  throw new Error('TODO: addLine');
}

export function place(order: DraftOrder, at: Date): PlacedOrder {
  throw new Error('TODO: place');
}

export function pay(order: PlacedOrder, method: PaymentMethod): PaidOrder {
  throw new Error('TODO: pay');
}

export function ship(order: PaidOrder, carrier: Carrier, tracking: string): ShippedOrder {
  throw new Error('TODO: ship');
}

export function deliver(order: ShippedOrder, at: Date): DeliveredOrder {
  throw new Error('TODO: deliver');
}

export function cancel(order: Order, reason: string): CancelledOrder {
  throw new Error('TODO: cancel');
}

// TODO 3 : switch exhaustif.
export function describe(order: Order): string {
  throw new Error('TODO: describe');
}

// TODO 4
export function refundTotal(orders: readonly Order[]): number {
  throw new Error('TODO: refundTotal');
}
