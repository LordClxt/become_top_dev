// TODO 1 : un type conditionnel au lieu des surcharges.
export function double(x: number): number;
export function double(x: string): string;
export function double(x: string | number): string | number {
  throw new Error('TODO: double');
}

// TODO 2
export type Convert<K extends 'int' | 'bool' | 'text'> = unknown;
export function convert(kind: 'int', raw: string): number;
export function convert(kind: 'bool', raw: string): boolean;
export function convert(kind: 'text', raw: string): string;
export function convert(kind: string, raw: string): unknown {
  throw new Error('TODO: convert');
}

// TODO 3
export type Unwrap<T> = T;
export type ElementOf<T> = T;

// TODO 4
export function firstOrSelf<T>(x: T): unknown {
  throw new Error('TODO: firstOrSelf');
}
