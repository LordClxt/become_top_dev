import { Module } from '@nestjs/common';
import { CheckoutService } from './payments.js';

// TODO : enregistre la configuration, les taux de change, la passerelle et l'alias LEGACY_GATEWAY,
// puis exporte ce dont les autres modules ont besoin.
export const LEGACY_GATEWAY = 'LEGACY_GATEWAY';

@Module({
  providers: [CheckoutService],
})
export class PaymentsModule {}
