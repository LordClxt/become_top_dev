// TODO 1 à 3 : réécris ces types en récursion terminale (accumulateur).
export type GetChars<S extends string> =
  S extends `${infer First}${infer Rest}` ? First | GetChars<Rest> : never;

export type Length<S extends string> =
  S extends `${string}${infer Rest}` ? [0, ...LengthTuple<Rest>]['length'] : 0;
type LengthTuple<S extends string> = S extends `${string}${infer Rest}` ? [0, ...LengthTuple<Rest>] : [];

export type ToSnake<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? `${First extends Lowercase<First> ? First : `_${Lowercase<First>}`}${ToSnake<Rest>}`
    : '';

// TODO 4
export function toSnake<S extends string>(s: S): ToSnake<S> {
  throw new Error('TODO: toSnake');
}

export function sum(nums: readonly number[]): number {
  return nums.length === 0 ? 0 : nums[0]! + sum(nums.slice(1));
}
