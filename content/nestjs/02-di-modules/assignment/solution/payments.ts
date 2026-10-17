import { Controller, Get, Injectable, Module, Param, Post, UnprocessableEntityException } from '@nestjs/common';
import { Ledger, LedgerModule, type Payment } from './ledger.js';

export type { Payment } from './ledger.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly ledger: Ledger) {}

  charge(orderId: string, amountCents: number): Payment {
    return this.ledger.addPayment({ orderId, amountCents, refunded: false });
  }

  refund(orderId: string): Payment {
    const payment = this.ledger.openPayment(orderId);
    if (!payment) throw new UnprocessableEntityException(`aucun paiement à rembourser pour ${orderId}`);
    payment.refunded = true;
    this.ledger.setStatus(orderId, 'refunded');
    return payment;
  }

  list(): Payment[] {
    return this.ledger.allPayments();
  }
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get() list() { return this.payments.list(); }
  @Post(':orderId/refund') refund(@Param('orderId') orderId: string) { return this.payments.refund(orderId); }
}

@Module({ imports: [LedgerModule], controllers: [PaymentsController], providers: [PaymentsService], exports: [PaymentsService] })
export class PaymentsModule {}
