type GetCharsHelp<S extends string, Acc> =
  S extends `${infer First}${infer Rest}` ? GetCharsHelp<Rest, Acc | First> : Acc;
/** Récursion terminale : l'appel récursif est toute la branche. */
export type GetChars<S extends string> = GetCharsHelp<S, never>;

type LengthHelp<S extends string, Acc extends unknown[]> =
  S extends `${string}${infer Rest}` ? LengthHelp<Rest, [...Acc, 0]> : Acc['length'];
export type Length<S extends string> = LengthHelp<S, []>;

type ToSnakeHelp<S extends string, Acc extends string> =
  S extends `${infer First}${infer Rest}`
    ? ToSnakeHelp<Rest, `${Acc}${First extends Lowercase<First> ? First : `_${Lowercase<First>}`}`>
    : Acc;
export type ToSnake<S extends string> = string extends S ? string : ToSnakeHelp<S, ''>;

export function toSnake<S extends string>(s: S): ToSnake<S> {
  // Assertion justifiée : le remplacement applique exactement la règle décrite par ToSnake.
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`) as ToSnake<S>;
}

/** Une boucle : JavaScript n'optimise pas la récursion terminale. */
export function sum(nums: readonly number[]): number {
  let total = 0;
  for (const n of nums) total += n;
  return total;
}
