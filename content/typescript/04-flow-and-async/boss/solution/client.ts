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

/** Client typé : API est fixé à la construction, Path est inféré à chaque get. */
export class Client<API> {
  private readonly transport: Transport;
  private readonly options: ClientOptions;
  private readonly cache = new Map<string, Promise<unknown>>();
  private requests = 0;
  private hits = 0;

  constructor(transport: Transport, options: ClientOptions) {
    this.transport = transport;
    this.options = options;
  }

  get<Path extends keyof API & string>(path: Path): Promise<API[Path]> {
    let pending = this.cache.get(path);
    if (pending) {
      this.hits++;
    } else {
      pending = this.attempt(path).catch((e: unknown) => {
        this.cache.delete(path);
        throw e;
      });
      this.cache.set(path, pending);
    }
    // Assertion justifiée : le serveur respecte le contrat décrit par API (non vérifié ici).
    return pending as Promise<API[Path]>;
  }

  getAll<const P extends readonly (keyof API & string)[]>(paths: P): Promise<{ -readonly [I in keyof P]: API[P[I]] }> {
    // Assertion justifiée : Promise.all garde l'ordre, chaque position correspond à sa route.
    return Promise.all(paths.map((path) => this.get(path))) as Promise<{ -readonly [I in keyof P]: API[P[I]] }>;
  }

  invalidate(path?: string): void {
    if (path === undefined) this.cache.clear();
    else this.cache.delete(path);
  }

  stats(): { requests: number; hits: number } {
    return { requests: this.requests, hits: this.hits };
  }

  private async attempt(path: string): Promise<unknown> {
    let lastError: unknown = new Error('aucune tentative');
    for (let i = 0; i <= this.options.retries; i++) {
      this.requests++;
      try {
        return await Promise.race([this.transport(path), timeout(this.options.timeoutMs)]);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }
}

export interface SalesReport {
  revenueByCategory: Record<string, number>;
  topProduct: string | undefined;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function salesReport(products: readonly Product[], orders: readonly Order[]): SalesReport {
  const byId = new Map(products.map((p) => [p.id, p]));
  const sold = orders
    .flatMap((o) => o.lines)
    .flatMap((line) => {
      const product = byId.get(line.productId);
      return product ? [{ product, qty: line.qty }] : [];
    });
  const revenueByCategory = Object.fromEntries(
    [...Map.groupBy(sold, (s) => s.product.category)].map(([category, items]) => [
      category,
      cents(items.reduce((sum, s) => sum + s.product.price * s.qty, 0)),
    ]),
  );
  const qtyByProduct = [...Map.groupBy(sold, (s) => s.product.name)].map(([name, items]) => ({
    name,
    qty: items.reduce((sum, s) => sum + s.qty, 0),
  }));
  return { revenueByCategory, topProduct: qtyByProduct.toSorted((a, b) => b.qty - a.qty)[0]?.name };
}
