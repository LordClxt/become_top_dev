// TODO 1
export type ToArray<T> = T;
export type ToArrayND<T> = T;

// TODO 2
export type IsNever<T> = T extends never ? true : false;

// TODO 3
export type IsTrue<V> = V extends true ? true : false;

// TODO 4 : non distributif.
export type Comparable<T> =
  T extends Date ? Date | number :
  T extends number ? number :
  T extends string ? string :
  never;

export function isLessThan<T>(a: T, b: Comparable<T>): boolean {
  throw new Error('TODO: isLessThan');
}

// TODO 5 : distributif sur N.
export type NTuple<T, N extends number> = T[];

export function repeat<T, N extends number>(value: T, n: N): NTuple<T, N> {
  throw new Error('TODO: repeat');
}
