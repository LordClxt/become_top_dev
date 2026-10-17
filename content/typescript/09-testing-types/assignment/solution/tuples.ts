type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };

/** Deux tuples de même longueur ; le modificateur const garde les littéraux. */
type Zip<A extends readonly unknown[], B extends readonly unknown[], Acc extends unknown[] = []> =
  A extends readonly [infer HA, ...infer RA]
    ? B extends readonly [infer HB, ...infer RB] ? Zip<RA, RB, [...Acc, [HA, HB]]> : Acc
    : Acc;
export function zip<const A extends readonly unknown[], const B extends readonly unknown[] & { length: A['length'] }>(
  a: A,
  b: B,
): Zip<A, B> {
  // Assertion justifiée : une paire par position, dans l'ordre, ce que décrit Zip.
  return a.map((x, i) => [x, b[i]]) as Zip<A, B>;
}

export function fromPairs<const P extends readonly (readonly [PropertyKey, unknown])[]>(
  pairs: P,
): Resolve<{ [E in P[number] as E[0]]: E[1] }> {
  // Assertion justifiée : Object.fromEntries crée une clé par paire, avec sa valeur.
  return Object.fromEntries(pairs) as Resolve<{ [E in P[number] as E[0]]: E[1] }>;
}

export function invert<const T extends Record<string, string>>(obj: T): Resolve<{ -readonly [K in keyof T as T[K]]: K }> {
  // Assertion justifiée : chaque valeur devient une clé dont la valeur est l'ancienne clé.
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k])) as Resolve<{ -readonly [K in keyof T as T[K]]: K }>;
}

type ReverseHelp<T extends readonly unknown[], Acc extends unknown[]> =
  T extends readonly [infer First, ...infer Rest] ? ReverseHelp<Rest, [First, ...Acc]> : Acc;
/** Récursion terminale : tient des tuples longs. */
export type Reverse<T extends readonly unknown[]> = ReverseHelp<T, []>;
export function reverse<const T extends readonly unknown[]>(tuple: T): Reverse<T> {
  // Assertion justifiée : Array.prototype.reverse inverse exactement l'ordre décrit par Reverse.
  return [...tuple].reverse() as Reverse<T>;
}

export function head<const T extends readonly [unknown, ...unknown[]]>(tuple: T): T[0] {
  return tuple[0];
}
