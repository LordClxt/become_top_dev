// TODO 1
export interface Attributes {
  id?: string;
  role?: string;
}

// TODO 2
export type ToCamel<S extends string> = S;
export type ObjectToCamel<T extends object> = T;

export function toCamel<S extends string>(s: S): ToCamel<S> {
  throw new Error('TODO: toCamel');
}

export function objectToCamel<T extends object>(obj: T): ObjectToCamel<T> {
  throw new Error('TODO: objectToCamel');
}

// TODO 3
export type RouteParams<P extends string> = Record<string, string>;

// TODO 4
export function matchRoute<P extends string>(pattern: P, path: string): RouteParams<P> | null {
  throw new Error('TODO: matchRoute');
}
