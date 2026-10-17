// TODO 1
export type Resolve<T> = T;

// TODO 2 : aplati ; T si K est never.
export type PartiallyPartial<T extends object, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

// TODO 3 : aplati.
export type WithId<T> = T & { id: string };

// TODO 4
export function withDefaults<D extends object, O extends object>(defaults: D, overrides: O): Omit<D, keyof O> & O {
  throw new Error('TODO: withDefaults');
}
