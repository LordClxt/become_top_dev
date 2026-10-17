export type ToArray<T> = T extends unknown ? T[] : never;
export type ToArrayND<T> = [T] extends [unknown] ? T[] : never;

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsTrue<V> = [V] extends [true] ? true : false;

/** Non distributif : une union mélangée (Date | string) donne never. */
export type Comparable<T> =
  [T] extends [Date] ? Date | number :
  [T] extends [number] ? number :
  [T] extends [string] ? string :
  never;

const toComparable = (v: unknown): number | string =>
  v instanceof Date ? v.getTime() : typeof v === 'number' || typeof v === 'string' ? v : NaN;

export function isLessThan<T>(a: T, b: Comparable<T>): boolean {
  return toComparable(a) < toComparable(b);
}

type NTupleHelp<T, N extends number, Acc extends unknown[]> =
  Acc['length'] extends N ? Acc : NTupleHelp<T, N, [T, ...Acc]>;
/** N extends number force la distribution sur une union de longueurs. */
export type NTuple<T, N extends number> = N extends number ? NTupleHelp<T, N, []> : never;

export function repeat<T, N extends number>(value: T, n: N): NTuple<T, N> {
  // Assertion justifiée : le tableau a exactement n éléments, tous égaux à value.
  return Array.from({ length: n }, () => value) as NTuple<T, N>;
}
