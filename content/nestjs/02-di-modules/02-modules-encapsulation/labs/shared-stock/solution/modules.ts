import { Module } from '@nestjs/common';
import { CatalogController, OrdersController, OrdersService, PriceService, StockService } from './services.js';

@Module({
  controllers: [CatalogController],
  providers: [StockService, PriceService],
  exports: [StockService],
})
export class CatalogModule {}

/** Module « socle » : il rend le catalogue disponible à qui l'importe. */
@Module({ imports: [CatalogModule], exports: [CatalogModule] })
export class CoreModule {}

@Module({
  imports: [CoreModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

@Module({ imports: [CoreModule, OrdersModule] })
export class AppModule {}
