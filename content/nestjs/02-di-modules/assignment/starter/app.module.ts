import { Module } from '@nestjs/common';
import { OrdersModule } from './orders.js';
import { PaymentsModule } from './payments.js';

@Module({ imports: [OrdersModule, PaymentsModule] })
export class AppModule {}
