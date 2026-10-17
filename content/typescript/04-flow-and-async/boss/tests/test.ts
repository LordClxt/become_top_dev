import { check, eq, raises, run, test } from './spec.ts';
import { Client, salesReport } from './client.ts';
import type { Order, Product, ShopAPI } from './client.ts';

const products: Product[] = [
  { id: 1, name: 'Clavier', category: 'info', price: 49.9 },
  { id: 2, name: 'Souris', category: 'info', price: 19.99 },
  { id: 3, name: 'Lampe', category: 'maison', price: 30 },
];
const orders: Order[] = [
  { id: 10, lines: [{ productId: 1, qty: 1 }, { productId: 2, qty: 3 }] },
  { id: 11, lines: [{ productId: 3, qty: 2 }, { productId: 99, qty: 5 }] },
];

/** Faux transport : délais et pannes programmables, compte les appels. */
function fakeTransport(opts: { delayMs?: number; failFirst?: number; slowPaths?: string[] } = {}) {
  let failures = opts.failFirst ?? 0;
  const calls: string[] = [];
  const data: Record<string, unknown> = { '/products': products, '/orders': orders, '/status': { ok: true } };
  const transport = async (path: string) => {
    calls.push(path);
    const delay = opts.slowPaths?.includes(path) ? 200 : (opts.delayMs ?? 5);
    await new Promise((r) => setTimeout(r, delay));
    if (failures > 0) { failures--; throw new Error('503'); }
    if (!(path in data)) throw new Error(`404 ${path}`);
    return structuredClone(data[path]);
  };
  return { transport, calls };
}

test('get typé et cache', async () => {
  const { transport, calls } = fakeTransport();
  const client = new Client<ShopAPI>(transport, { timeoutMs: 100, retries: 0 });
  const [a, b] = await Promise.all([client.get('/products'), client.get('/products')]);
  eq(a.length, 3, 'produits');
  check(a === b, 'les deux appels simultanés partagent la même réponse');
  await client.get('/products');
  eq(calls, ['/products'], 'un seul appel au transport');
  eq(client.stats(), { requests: 1, hits: 2 }, 'stats');
});

test('tentatives', async () => {
  const { transport, calls } = fakeTransport({ failFirst: 2 });
  const client = new Client<ShopAPI>(transport, { timeoutMs: 100, retries: 2 });
  eq(await client.get('/status'), { ok: true }, 'succès au 3e essai');
  eq(calls.length, 3, 'trois appels');
  const { transport: t2 } = fakeTransport({ failFirst: 5 });
  const c2 = new Client<ShopAPI>(t2, { timeoutMs: 100, retries: 1 });
  const e = await raises(() => c2.get('/status'), 'échec définitif');
  eq(e.message, '503', 'dernière erreur');
  eq(c2.stats().requests, 2, '1 + 1 tentatives');
});

test('délai par tentative et échec retiré du cache', async () => {
  const { transport, calls } = fakeTransport({ slowPaths: ['/orders'] });
  const client = new Client<ShopAPI>(transport, { timeoutMs: 30, retries: 1 });
  const start = Date.now();
  const e = await raises(() => client.get('/orders'), 'trop lent');
  eq(e.message, 'délai dépassé', 'message');
  check(Date.now() - start < 150, 'chaque tentative est coupée au bout de 30 ms');
  await raises(() => client.get('/orders'), 'nouvel essai après échec');
  eq(calls.length, 4, "l'échec n'est pas resté en cache");
});

test('invalidate', async () => {
  const { transport, calls } = fakeTransport();
  const client = new Client<ShopAPI>(transport, { timeoutMs: 100, retries: 0 });
  await client.get('/products');
  await client.get('/orders');
  client.invalidate('/products');
  await client.get('/products');
  await client.get('/orders');
  eq(calls, ['/products', '/orders', '/products'], 'seul /products est rechargé');
  client.invalidate();
  await client.get('/orders');
  eq(calls.length, 4, 'tout le cache est vidé');
});

test('getAll en parallèle', async () => {
  const { transport } = fakeTransport({ delayMs: 50 });
  const client = new Client<ShopAPI>(transport, { timeoutMs: 200, retries: 0 });
  const start = Date.now();
  const [ps, os, st] = await client.getAll(['/products', '/orders', '/status'] as const);
  check(Date.now() - start < 120, 'les trois routes partent ensemble');
  eq([ps.length, os.length, st.ok], [3, 2, true], 'résultats dans l’ordre');
});

test('salesReport', () => {
  eq(salesReport(products, orders), { revenueByCategory: { info: 109.87, maison: 60 }, topProduct: 'Souris' }, 'rapport');
  eq(salesReport(products, []), { revenueByCategory: {}, topProduct: undefined }, 'sans commande');
});

await run();
