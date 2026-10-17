/** Égalité exacte : deux fonctions génériques identiques seulement si X et Y le sont. */
export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
export type Expect<T extends true> = T;
export type ExpectFalse<T extends false> = T;
/** 1 & T vaut never, sauf pour any (qui absorbe tout). */
export type IsAny<T> = 0 extends 1 & T ? true : false;
/** Non distributif : l'union entière doit être assignable. */
export type Assignable<From, To> = [From] extends [To] ? true : false;

/** Curryfiée : T est fixé explicitement, V est inféré de la valeur puis comparé à T. */
export function assertType<T>() {
  return <V>(value: V & (Equals<V, T> extends true ? unknown : never)): V => value;
}
