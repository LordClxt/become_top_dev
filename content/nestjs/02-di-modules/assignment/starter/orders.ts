import { Controller, Get, Injectable, Module, NotFoundException, Param, Post } from '@nestjs/common';
import { PaymentsModule, PaymentsService } from './payments.js';

export type OrderStatus = 'pending' | 'paid' | 'refunded';
export interface Order { id: string; amountCents: number; status: OrderStatus }

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, Order>([
    ['ord_1', { id: 'ord_1', amountCents: 1290, status: 'pending' }],
    ['ord_2', { id: 'ord_2', amountCents: 890, status: 'pending' }],
  ]);

  constructor(private readonly payments: PaymentsService) {}

  get(id: string): Order {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException(`commande ${id} introuvable`);
    return order;
  }

  pay(id: string): Order {
    const order = this.get(id);
    this.payments.charge(order.id, order.amountCents);
    order.status = 'paid';
    return order;
  }

  /** Appelé par PaymentsService quand un remboursement aboutit. */
  markRefunded(id: string): void {
    this.get(id).status = 'refunded';
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get(':id') get(@Param('id') id: string) { return this.orders.get(id); }
  @Post(':id/pay') pay(@Param('id') id: string) { return this.orders.pay(id); }
}

@Module({ imports: [PaymentsModule], controllers: [OrdersController], providers: [OrdersService], exports: [OrdersService] })
export class OrdersModule {}
