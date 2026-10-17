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

// TODO 1 : renvoie TOUJOURS une Promise<number> (annote le retour). Cache d'abord, sinon fetchPrice puis mise en cache.
export function getQuote(ticker: string) {
  throw new Error('TODO: getQuote');
}

export interface Vector2D {
  x: number;
  y: number;
}

// TODO 2 : renvoie un Vector2D (annote le retour avec le type nommé).
export function add(a: Vector2D, b: Vector2D) {
  throw new Error('TODO: add');
}

export interface Product {
  id: number;
  name: string;
  price: number;
}

// TODO 3 : "Elmo (#7) : 28.99 €" — décomposition, aucune annotation locale.
export function formatProduct(product: Product): string {
  throw new Error('TODO: formatProduct');
}

// TODO 4 : entier positif ou nul, sinon null. Plusieurs return : annote number | null.
export function parseQuantity(input: string) {
  throw new Error('TODO: parseQuantity');
}
