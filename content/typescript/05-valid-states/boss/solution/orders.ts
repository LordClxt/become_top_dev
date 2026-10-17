export interface Line {
  sku: string;
  qty: number;
  unitCents: number;
}
export type Carrier = 'colissimo' | 'ups';
export type PaymentMethod = 'card' | 'transfer';

interface OrderBase {
  id: number;
  lines: readonly Line[];
}
export interface DraftOrder extends OrderBase { status: 'draft' }
export interface PlacedOrder extends OrderBase { status: 'placed'; placedAt: Date }
export interface PaidOrder extends Omit<PlacedOrder, 'status'> {
  status: 'paid';
  payment: { method: PaymentMethod; amountCents: number };
}
export interface ShippedOrder extends Omit<PaidOrder, 'status'> {
  status: 'shipped';
  shipment: { carrier: Carrier; tracking: string };
}
export interface DeliveredOrder extends Omit<ShippedOrder, 'status'> { status: 'delivered'; deliveredAt: Date }
export interface CancelledOrder extends OrderBase { status: 'cancelled'; reason: string; refundCents: number }
export type Order = DraftOrder | PlacedOrder | PaidOrder | ShippedOrder | DeliveredOrder | CancelledOrder;

export function draft(id: number): DraftOrder {
  return { id, status: 'draft', lines: [] };
}

export function totalCents(lines: readonly Line[]): number {
  return lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0);
}

export function addLine(order: DraftOrder, line: Line): DraftOrder {
  const exists = order.lines.some((l) => l.sku === line.sku);
  const lines = exists
    ? order.lines.map((l) => (l.sku === line.sku ? { ...l, qty: l.qty + line.qty } : l))
    : [...order.lines, line];
  return { ...order, lines };
}

export function place(order: DraftOrder, at: Date): PlacedOrder {
  if (order.lines.length === 0) throw new Error('commande vide');
  return { ...order, status: 'placed', placedAt: at };
}

export function pay(order: PlacedOrder, method: PaymentMethod): PaidOrder {
  return { ...order, status: 'paid', payment: { method, amountCents: totalCents(order.lines) } };
}

const TRACKING_FORMATS: Record<Carrier, RegExp> = {
  colissimo: /^[A-Z]{2}\d{9}FR$/,
  ups: /^1Z[A-Z0-9]{16}$/,
};

export function ship(order: PaidOrder, carrier: Carrier, tracking: string): ShippedOrder {
  if (!TRACKING_FORMATS[carrier].test(tracking)) throw new Error('numéro de suivi invalide');
  return { ...order, status: 'shipped', shipment: { carrier, tracking } };
}

export function deliver(order: ShippedOrder, at: Date): DeliveredOrder {
  return { ...order, status: 'delivered', deliveredAt: at };
}

export function cancel(order: DraftOrder | PlacedOrder | PaidOrder, reason: string): CancelledOrder {
  const { id, lines } = order;
  const refundCents = order.status === 'paid' ? order.payment.amountCents : 0;
  return { status: 'cancelled', id, lines, reason, refundCents };
}

const euros = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

export function describe(order: Order): string {
  const ref = `#${order.id}`;
  switch (order.status) {
    case 'draft': return `${ref} brouillon (${order.lines.length} lignes)`;
    case 'placed': return `${ref} commandée`;
    case 'paid': return `${ref} payée ${euros(order.payment.amountCents)}`;
    case 'shipped': return `${ref} expédiée par ${order.shipment.carrier} (${order.shipment.tracking})`;
    case 'delivered': return `${ref} livrée le ${order.deliveredAt.toISOString().slice(0, 10)}`;
    case 'cancelled': return `${ref} annulée : ${order.reason} (remboursement ${euros(order.refundCents)})`;
    default: {
      const never: never = order;
      throw new Error(`état inconnu : ${JSON.stringify(never)}`);
    }
  }
}

export function refundTotal(orders: readonly Order[]): number {
  return orders.reduce((sum, o) => sum + (o.status === 'cancelled' ? o.refundCents : 0), 0);
}
