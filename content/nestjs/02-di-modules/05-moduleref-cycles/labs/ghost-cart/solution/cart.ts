import { Body, Controller, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import { AuditLogger } from './audit.js';

export interface Line { isbn: string; qty: number; priceCents: number }

/**
 * Cause n°1 : CartService injectait AuditLogger, request-scoped. La portée remontait,
 * CartService était recréé à chaque requête et sa Map repartait vide.
 * Les paniers vivent maintenant dans un singleton qui ne dépend pas de la requête.
 */
@Injectable()
export class CartStore {
  private readonly carts = new Map<string, Line[]>();

  add(customer: string, line: Line): Line[] {
    const cart = this.carts.get(customer) ?? [];
    cart.push(line);
    this.carts.set(customer, cart);
    return cart;
  }

  get(customer: string): Line[] {
    return this.carts.get(customer) ?? [];
  }

  grandTotal(): number {
    let total = 0;
    for (const cart of this.carts.values()) for (const l of cart) total += l.qty * l.priceCents;
    return total;
  }
}

/** Request-scoped par contagion (AuditLogger), et c'est sans danger : il ne garde aucun état. */
@Injectable()
export class CartService {
  constructor(private readonly store: CartStore, private readonly audit: AuditLogger) {}

  add(customer: string, line: Line): Line[] {
    const cart = this.store.add(customer, line);
    this.audit.log(`ajout ${line.isbn} pour ${customer}`);
    return cart;
  }

  get(customer: string): Line[] {
    return this.store.get(customer);
  }
}

@Controller('carts')
export class CartController {
  constructor(private readonly carts: CartService) {}
  @Post(':customer') add(@Param('customer') c: string, @Body() line: Line) { return this.carts.add(c, line); }
  @Get(':customer') get(@Param('customer') c: string) { return this.carts.get(c); }
}

@Module({ controllers: [CartController], providers: [CartStore, CartService, AuditLogger], exports: [CartStore] })
export class CartModule {}
