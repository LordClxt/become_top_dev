import { Module } from '@nestjs/common';
import { GreetingService } from './shop.js';

// TODO : fournis la valeur 'La Page Tournée' sous le jeton SHOP_NAME.
@Module({ providers: [GreetingService], exports: [GreetingService] })
export class ShopModule {}
