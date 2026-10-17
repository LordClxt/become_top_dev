import { Body, Controller, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import { AuditLogger } from './audit.js';

export interface Line { isbn: string; qty: number; priceCents: number }

@Injectable()
export class CartService {
  private readonly carts = new Map<string, Line[]>();

  constructor(private readonly audit: AuditLogger) {}

  add(customer: string, line: Line): Line[] {
    const cart = this.carts.get(customer) ?? [];
    cart.push(line);
    this.carts.set(customer, cart);
    this.audit.log(`ajout ${line.isbn} pour ${customer}`);
    return cart;
  }

  get(customer: string): Line[] {
    return this.carts.get(customer) ?? [];
  }

  /** Total de tous les paniers, en centimes. */
  grandTotal(): number {
    let total = 0;
    for (const cart of this.carts.values()) for (const l of cart) total += l.qty * l.priceCents;
    return total;
  }
}

@Controller('carts')
export class CartController {
  constructor(private readonly carts: CartService) {}
  @Post(':customer') add(@Param('customer') c: string, @Body() line: Line) { return this.carts.add(c, line); }
  @Get(':customer') get(@Param('customer') c: string) { return this.carts.get(c); }
}

@Module({ controllers: [CartController], providers: [CartService, AuditLogger] })
export class CartModule {}
