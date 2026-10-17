// Le code d'exécution est correct : ce sont les TYPES qu'il faut écrire (voir tests/types.ts).

export function zip(a: readonly unknown[], b: readonly unknown[]): unknown[] {
  return a.map((x, i) => [x, b[i]]);
}

export function fromPairs(pairs: readonly (readonly [PropertyKey, unknown])[]): Record<PropertyKey, unknown> {
  return Object.fromEntries(pairs);
}

export function invert(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}

export type Reverse<T extends readonly unknown[]> = unknown[];
export function reverse(tuple: readonly unknown[]): unknown[] {
  return [...tuple].reverse();
}

export function head(tuple: readonly unknown[]): unknown {
  return tuple[0];
}
