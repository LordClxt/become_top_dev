import { Controller, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import { Ledger, LedgerModule, type Order } from './ledger.js';
import { PaymentsModule, PaymentsService } from './payments.js';

export type { Order, OrderStatus } from './ledger.js';

@Injectable()
export class OrdersService {
  constructor(private readonly ledger: Ledger, private readonly payments: PaymentsService) {}

  get(id: string): Order {
    return this.ledger.order(id);
  }

  pay(id: string): Order {
    const order = this.get(id);
    this.payments.charge(order.id, order.amountCents);
    return this.ledger.setStatus(id, 'paid');
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get(':id') get(@Param('id') id: string) { return this.orders.get(id); }
  @Post(':id/pay') pay(@Param('id') id: string) { return this.orders.pay(id); }
}

@Module({ imports: [LedgerModule, PaymentsModule], controllers: [OrdersController], providers: [OrdersService], exports: [OrdersService] })
export class OrdersModule {}
