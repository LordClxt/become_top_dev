import { Module } from '@nestjs/common';
import { GreetingService, SHOP_NAME } from './shop.js';

@Module({
  providers: [{ provide: SHOP_NAME, useValue: 'La Page Tournée' }, GreetingService],
  exports: [GreetingService],
})
export class ShopModule {}
