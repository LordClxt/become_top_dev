export function double<T extends string | number>(x: T): T extends string ? string : number;
export function double(x: string | number): string | number {
  return typeof x === 'string' ? x + x : x * 2;
}

type Kind = 'int' | 'bool' | 'text';
export type Convert<K extends Kind> = K extends 'int' ? number : K extends 'bool' ? boolean : string;

export function convert<K extends Kind>(kind: K, raw: string): Convert<K>;
export function convert(kind: Kind, raw: string): number | boolean | string {
  switch (kind) {
    case 'int': {
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) throw new Error('entier invalide');
      return n;
    }
    case 'bool': return raw === 'true';
    case 'text': return raw;
  }
}

export type Unwrap<T> = T extends Promise<infer U> ? U : T;
export type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

export function firstOrSelf<T>(x: T): T extends readonly (infer E)[] ? E | undefined : T;
export function firstOrSelf(x: unknown): unknown {
  return Array.isArray(x) ? x[0] : x;
}
