import type { Equals, Expect } from './expect.ts';
import { Client } from './client.ts';
import type { Order, Product, ShopAPI } from './client.ts';

declare const client: Client<ShopAPI>;
const p = client.get('/products');
const all = client.getAll(['/products', '/orders'] as const);

export type Checks = [
  Expect<Equals<typeof p, Promise<Product[]>>>,
  Expect<Equals<typeof all, Promise<[Product[], Order[]]>>>,
];

// @ts-expect-error route inconnue
client.get('/users');
