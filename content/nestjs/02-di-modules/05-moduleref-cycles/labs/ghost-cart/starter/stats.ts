import { Controller, Get, Module } from '@nestjs/common';
import { AuditLogger } from './audit.js';
import { CartService } from './cart.js';

@Controller('stats')
export class StatsController {
  constructor(private readonly carts: CartService) {}
  @Get() get() { return { grandTotalCents: this.carts.grandTotal() }; }
}

@Module({ controllers: [StatsController], providers: [CartService, AuditLogger] })
export class StatsModule {}
