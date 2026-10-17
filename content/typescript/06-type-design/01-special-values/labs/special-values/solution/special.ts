export function safeIndexOf<T>(vals: readonly T[], val: T): number | null {
  const index = vals.indexOf(val);
  return index === -1 ? null : index;
}

export function splitAround<T>(vals: readonly T[], val: T): [T[], T[]] {
  const index = safeIndexOf(vals, val);
  if (index === null) return [[...vals], []];
  return [vals.slice(0, index), vals.slice(index + 1)];
}

export type Price = { kind: 'dollars'; amount: number } | { kind: 'credits'; count: number };

export function fromLegacy(priceDollars: number, credits: number): Price {
  return priceDollars === -1 ? { kind: 'credits', count: credits } : { kind: 'dollars', amount: priceDollars };
}

export function totals(prices: readonly Price[]): { dollars: number; credits: number } {
  let dollars = 0;
  let credits = 0;
  for (const price of prices) {
    if (price.kind === 'dollars') dollars += price.amount;
    else credits += price.count;
  }
  return { dollars: Math.round(dollars * 100) / 100, credits };
}

export type Lookup<V> = { status: 'found'; value: V } | { status: 'missing' } | { status: 'forbidden' };

export function lookup<V>(map: ReadonlyMap<string, V>, key: string): Lookup<V> {
  if (key.startsWith('_')) return { status: 'forbidden' };
  const value = map.get(key);
  return value === undefined ? { status: 'missing' } : { status: 'found', value };
}
