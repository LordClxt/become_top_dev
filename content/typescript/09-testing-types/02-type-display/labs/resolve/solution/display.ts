/** Aplatit un objet pour l'affichage (et pour Equals) ; les fonctions restent intactes. */
export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };

export type PartiallyPartial<T extends object, K extends keyof T> =
  [K] extends [never] ? T : Resolve<Partial<Pick<T, K>> & Omit<T, K>>;

export type WithId<T> = Resolve<T & { id: string }>;

export function withDefaults<D extends object, O extends object>(defaults: D, overrides: O): Resolve<Omit<D, keyof O> & O> {
  // Assertion justifiée : la décomposition garde les clés de D absentes de O, puis toutes celles de O.
  return { ...defaults, ...overrides } as unknown as Resolve<Omit<D, keyof O> & O>;
}
