import { Injectable, Module, NotFoundException } from '@nestjs/common';

export type OrderStatus = 'pending' | 'paid' | 'refunded';
export interface Order { id: string; amountCents: number; status: OrderStatus }
export interface Payment { orderId: string; amountCents: number; refunded: boolean }

/**
 * L'état que les deux services se disputaient : les commandes et leurs paiements.
 * Orders et Payments en dépendent tous les deux ; lui ne dépend de personne, le cycle disparaît.
 */
@Injectable()
export class Ledger {
  private readonly orders = new Map<string, Order>([
    ['ord_1', { id: 'ord_1', amountCents: 1290, status: 'pending' }],
    ['ord_2', { id: 'ord_2', amountCents: 890, status: 'pending' }],
  ]);
  private readonly payments: Payment[] = [];

  order(id: string): Order {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException(`commande ${id} introuvable`);
    return order;
  }

  setStatus(id: string, status: OrderStatus): Order {
    const order = this.order(id);
    order.status = status;
    return order;
  }

  addPayment(payment: Payment): Payment {
    this.payments.push(payment);
    return payment;
  }

  openPayment(orderId: string): Payment | undefined {
    return this.payments.find((p) => p.orderId === orderId && !p.refunded);
  }

  allPayments(): Payment[] {
    return this.payments;
  }
}

@Module({ providers: [Ledger], exports: [Ledger] })
export class LedgerModule {}
