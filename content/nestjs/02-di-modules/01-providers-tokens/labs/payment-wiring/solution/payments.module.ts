import { Module } from '@nestjs/common';
import {
  CheckoutService, FakeGateway, FX_RATES, LiveGateway, loadRates, PAYMENTS_CONFIG, PaymentGateway,
  type PaymentsConfig,
} from './payments.js';

export const LEGACY_GATEWAY = 'LEGACY_GATEWAY';

@Module({
  providers: [
    { provide: PAYMENTS_CONFIG, useValue: { mode: 'test', currency: 'EUR' } satisfies PaymentsConfig },
    { provide: FX_RATES, useFactory: () => loadRates() },
    {
      provide: PaymentGateway,
      useFactory: (config: PaymentsConfig) => (config.mode === 'live' ? new LiveGateway() : new FakeGateway()),
      inject: [PAYMENTS_CONFIG],
    },
    { provide: LEGACY_GATEWAY, useExisting: PaymentGateway },
    CheckoutService,
  ],
  exports: [CheckoutService, PaymentGateway, LEGACY_GATEWAY],
})
export class PaymentsModule {}
