import { Controller, Get, Injectable, Module, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { OrdersModule, OrdersService } from './orders.js';

export interface Payment { orderId: string; amountCents: number; refunded: boolean }

@Injectable()
export class PaymentsService {
  private readonly payments: Payment[] = [];

  constructor(private readonly orders: OrdersService) {}

  charge(orderId: string, amountCents: number): Payment {
    const payment = { orderId, amountCents, refunded: false };
    this.payments.push(payment);
    return payment;
  }

  refund(orderId: string): Payment {
    const payment = this.payments.find((p) => p.orderId === orderId && !p.refunded);
    if (!payment) throw new UnprocessableEntityException(`aucun paiement à rembourser pour ${orderId}`);
    payment.refunded = true;
    this.orders.markRefunded(orderId);
    return payment;
  }

  list(): Payment[] {
    return this.payments;
  }
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get() list() { return this.payments.list(); }
  @Post(':orderId/refund') refund(@Param('orderId') orderId: string) { return this.payments.refund(orderId); }
}

@Module({ imports: [OrdersModule], controllers: [PaymentsController], providers: [PaymentsService], exports: [PaymentsService] })
export class PaymentsModule {}
