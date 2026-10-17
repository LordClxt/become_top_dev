import { Global, Module } from '@nestjs/common';
import { CatalogController, OrdersController, OrdersService, PriceService, StockService } from './services.js';

@Global()
@Module({
  controllers: [CatalogController],
  providers: [StockService, PriceService],
  exports: [PriceService],
})
export class CatalogModule {}

/** Module « socle » : il devrait rendre le catalogue disponible à qui l'importe. */
@Module({})
export class CoreModule {}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, StockService],
})
export class OrdersModule {}

@Module({ imports: [CatalogModule, OrdersModule] })
export class AppModule {}
