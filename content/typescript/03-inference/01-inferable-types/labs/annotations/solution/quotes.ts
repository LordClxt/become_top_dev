/** Simule un appel réseau : compte les appels pour vérifier le cache. */
export const prices: Record<string, number> = { MSFT: 420.5, AAPL: 230.1, GOOG: 165.2 };
export let fetchCount = 0;
export async function fetchPrice(ticker: string): Promise<number> {
  fetchCount++;
  const price = prices[ticker];
  if (price === undefined) throw new Error(`cotation inconnue : ${ticker}`);
  return price;
}

const cache = new Map<string, number>();

/** Contrat public : toujours une promesse, même quand la valeur est déjà connue. */
export function getQuote(ticker: string): Promise<number> {
  const cached = cache.get(ticker);
  if (cached !== undefined) return Promise.resolve(cached);
  return fetchPrice(ticker).then((price) => {
    cache.set(ticker, price);
    return price;
  });
}

export interface Vector2D {
  x: number;
  y: number;
}

export function add(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export interface Product {
  id: number;
  name: string;
  price: number;
}

export function formatProduct(product: Product): string {
  const { id, name, price } = product;
  return `${name} (#${id}) : ${price.toFixed(2)} €`;
}

export function parseQuantity(input: string): number | null {
  const text = input.trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}
