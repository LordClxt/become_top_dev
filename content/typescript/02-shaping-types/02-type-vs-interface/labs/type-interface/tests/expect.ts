/**
 * Outils de test de types (méthode des Type Challenges, Effective TypeScript item 55).
 * Copié dans tests/ des TP qui vérifient des types (source : sandbox/images/typescript/expect.ts).
 *
 *   type _t1 = Expect<Equals<ReturnType<typeof f>, number>>;
 *   // @ts-expect-error l'argument doit être refusé
 *   f('x');
 */
export type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
export type Expect<T extends true> = T;
