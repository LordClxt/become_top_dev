import type { Equals, Expect } from './expect.ts';
import { cancel, deliver, draft, pay, place, ship } from './orders.ts';
import type { DeliveredOrder, Order, PaidOrder } from './orders.ts';

export type Checks = [
  Expect<Equals<Order['status'], 'draft' | 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'>>,
  Expect<Equals<PaidOrder['payment'], { method: 'card' | 'transfer'; amountCents: number }>>,
  Expect<Equals<DeliveredOrder['shipment']['tracking'], string>>,
  Expect<Equals<Extract<Order, { status: 'draft' }>['status'], 'draft'>>,
];

const d = draft(1);
const placed = place(d, new Date());
const paid = pay(placed, 'card');
const shipped = ship(paid, 'ups', '1Z999AA10123456784');

// @ts-expect-error on ne peut pas expédier une commande non payée
ship(placed, 'ups', '1Z999AA10123456784');
// @ts-expect-error on ne peut pas payer un brouillon
pay(d, 'card');
// @ts-expect-error on ne peut pas annuler une commande expédiée
cancel(shipped, 'trop tard');
// @ts-expect-error on ne livre que ce qui est expédié
deliver(paid, new Date());
// @ts-expect-error une commande livrée a forcément une expédition
export const bad: DeliveredOrder = { id: 1, status: 'delivered', lines: [], placedAt: new Date(), payment: { method: 'card', amountCents: 1 }, deliveredAt: new Date() };
