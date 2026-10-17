export interface Product { id: number; name: string; category: string; price: number }
export interface OrderLine { productId: number; qty: number }
export interface Order { id: number; lines: OrderLine[] }

export interface ShopAPI {
  '/products': Product[];
  '/orders': Order[];
  '/status': { ok: boolean };
}

export type Transport = (path: string) => Promise<unknown>;

export function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), ms));
}

export interface ClientOptions {
  timeoutMs: number;
  retries: number;
}

// TODO 1 : API fixé à la construction ; get<Path> inféré à chaque appel.
// Délai par tentative, `retries` tentatives supplémentaires, cache de promesses, invalidate, stats.
export class Client<API> {
  constructor(transport: Transport, options: ClientOptions) {
    throw new Error('TODO: Client');
  }

  get(path: string): Promise<unknown> {
    throw new Error('TODO: get');
  }

  // TODO 2 : un tuple typé, en parallèle.
  getAll(paths: readonly string[]): Promise<unknown[]> {
    throw new Error('TODO: getAll');
  }

  invalidate(path?: string): void {
    throw new Error('TODO: invalidate');
  }

  stats(): { requests: number; hits: number } {
    throw new Error('TODO: stats');
  }
}

export interface SalesReport {
  revenueByCategory: Record<string, number>;
  topProduct: string | undefined;
}

// TODO 3 : chiffre d'affaires par catégorie et produit le plus vendu (en quantité).
export function salesReport(products: readonly Product[], orders: readonly Order[]): SalesReport {
  throw new Error('TODO: salesReport');
}
