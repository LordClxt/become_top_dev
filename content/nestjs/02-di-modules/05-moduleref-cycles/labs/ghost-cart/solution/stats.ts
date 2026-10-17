import { Controller, Get, Module } from '@nestjs/common';
import { CartModule, CartStore } from './cart.js';

/** Cause n°2 : StatsModule redéclarait CartService, donc lisait une seconde instance, toujours vide. */
@Controller('stats')
export class StatsController {
  constructor(private readonly carts: CartStore) {}
  @Get() get() { return { grandTotalCents: this.carts.grandTotal() }; }
}

@Module({ imports: [CartModule], controllers: [StatsController] })
export class StatsModule {}
