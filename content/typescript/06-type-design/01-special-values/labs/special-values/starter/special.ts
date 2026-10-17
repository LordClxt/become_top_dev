// TODO 1 : l'indice ou null.
export function safeIndexOf<T>(vals: readonly T[], val: T): number {
  return vals.indexOf(val);
}

// TODO 2 : [avant, après] ; absent → [copie, []].
export function splitAround<T>(vals: readonly T[], val: T): [T[], T[]] {
  const index = safeIndexOf(vals, val);
  return [vals.slice(0, index), vals.slice(index + 1)];
}

// TODO 3 : une union taguée dollars | credits.
export type Price = number;

export function fromLegacy(priceDollars: number, credits: number): Price {
  throw new Error('TODO: fromLegacy');
}

// TODO 4 : sommes séparées.
export function totals(prices: readonly Price[]): { dollars: number; credits: number } {
  throw new Error('TODO: totals');
}

// TODO 5 : found | missing | forbidden (clé qui commence par _).
export type Lookup<V> = V | undefined;

export function lookup<V>(map: ReadonlyMap<string, V>, key: string): Lookup<V> {
  throw new Error('TODO: lookup');
}
