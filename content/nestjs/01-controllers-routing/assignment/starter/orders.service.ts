import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export enum OrderStatus {
  Pending = 'pending',
  Shipped = 'shipped',
  Cancelled = 'cancelled',
}

export interface OrderItem {
  isbn: string;
  qty: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
}

export class OrderNotFoundError extends Error {}
export class OrderShippedError extends Error {}

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, Order>();

  create(items: OrderItem[]): Order {
    const order: Order = { id: randomUUID(), status: OrderStatus.Pending, items: items.map((i) => ({ ...i })) };
    this.orders.set(order.id, order);
    return order;
  }

  find(id: string): Order | undefined {
    return this.orders.get(id);
  }

  list(status?: OrderStatus): Order[] {
    const all = [...this.orders.values()];
    return status ? all.filter((o) => o.status === status) : all;
  }

  /** Idempotent : annuler une commande déjà annulée ne change rien. */
  cancel(id: string): Order {
    const order = this.orders.get(id);
    if (!order) throw new OrderNotFoundError(id);
    if (order.status === OrderStatus.Shipped) throw new OrderShippedError(id);
    order.status = OrderStatus.Cancelled;
    return order;
  }

  /** Utilisé par l'entrepôt (et par les tests). */
  ship(id: string): Order {
    const order = this.orders.get(id);
    if (!order) throw new OrderNotFoundError(id);
    order.status = OrderStatus.Shipped;
    return order;
  }
}
