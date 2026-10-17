export interface Attributes {
  id?: string;
  role?: string;
  [key: `data-${string}`]: string | number;
}

export type ToCamel<S extends string> =
  S extends `${infer Head}_${infer Tail}` ? `${Head}${Capitalize<ToCamel<Tail>>}` : S;
export type ObjectToCamel<T extends object> = { [K in keyof T as ToCamel<K & string>]: T[K] };

export function toCamel<S extends string>(s: S): ToCamel<S>;
export function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function objectToCamel<T extends object>(obj: T): ObjectToCamel<T> {
  // Assertion justifiée : chaque clé est renommée par toCamel, exactement comme le décrit ObjectToCamel.
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamel(k), v])) as ObjectToCamel<T>;
}

export type RouteParams<P extends string> =
  P extends `${string}:${infer Param}/${infer Rest}` ? { [K in Param | keyof RouteParams<Rest>]: string } :
  P extends `${string}:${infer Param}` ? { [K in Param]: string } :
  {};

export function matchRoute<P extends string>(pattern: P, path: string): RouteParams<P> | null {
  const expected = pattern.split('/');
  const actual = path.split('/');
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (const [i, segment] of expected.entries()) {
    const value = actual[i] ?? '';
    if (segment.startsWith(':')) params[segment.slice(1)] = value;
    else if (segment !== value) return null;
  }
  // Assertion justifiée : on a extrait un paramètre par segment `:nom` du motif, ce que décrit RouteParams.
  return params as RouteParams<P>;
}
