import { Body, Controller, Get, Injectable, NotFoundException, Param, Post, UnprocessableEntityException } from '@nestjs/common';

/** Stock en mémoire : un état, donc une instance unique est indispensable. */
@Injectable()
export class StockService {
  static instances = 0;
  private readonly stock = new Map<string, number>([['978-2253004226', 3], ['978-2070360024', 1]]);
  constructor() {
    StockService.instances++;
  }
  get(isbn: string): number | undefined {
    return this.stock.get(isbn);
  }
  take(isbn: string, qty: number): boolean {
    const left = this.stock.get(isbn) ?? 0;
    if (left < qty) return false;
    this.stock.set(isbn, left - qty);
    return true;
  }
}

/** Détail interne du catalogue : ne doit pas fuiter hors de CatalogModule. */
@Injectable()
export class PriceService {
  priceOf(isbn: string): number {
    return isbn.endsWith('6') ? 890 : 750;
  }
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly stock: StockService, private readonly prices: PriceService) {}
  @Get(':isbn')
  get(@Param('isbn') isbn: string) {
    const stock = this.stock.get(isbn);
    if (stock === undefined) throw new NotFoundException();
    return { isbn, stock, priceCents: this.prices.priceOf(isbn) };
  }
}

@Injectable()
export class OrdersService {
  constructor(private readonly stock: StockService) {}
  order(isbn: string, qty: number) {
    if (!this.stock.take(isbn, qty)) throw new UnprocessableEntityException('stock insuffisant');
    return { isbn, qty };
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Post()
  create(@Body() body: { isbn: string; qty: number }) {
    return this.orders.order(body.isbn, body.qty);
  }
}
