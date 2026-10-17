import { Inject, Injectable } from '@nestjs/common';

/** Le nom de la boutique : une simple chaîne, pas une classe. */
export const SHOP_NAME = Symbol('SHOP_NAME');

@Injectable()
export class GreetingService {
  constructor(@Inject(SHOP_NAME) private readonly shopName: string) {}
  greet(customer: string): string {
    return `Bienvenue chez ${this.shopName}, ${customer} !`;
  }
}
